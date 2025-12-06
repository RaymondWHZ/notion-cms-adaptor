import type {
  DataSourceObjectResponse,
  PageObjectResponse,
  PartialDataSourceObjectResponse,
  PartialPageObjectResponse,
  QueryDataSourceParameters,
  UpdatePageParameters,
} from "@notionhq/client/build/src/api-endpoints";
import {
  Client,
  collectPaginatedAPI,
  isFullBlock,
  isFullPage,
} from "@notionhq/client";
import type {
  DBInfer,
  DBMutateInfer,
  DBSchemasType,
  DBSchemaType,
  DBSchemaValueDef,
  NotionPageContent,
  NotionMutProperties,
  ValueComposer,
  ValueHandler,
  ValueType,
  KeysWithValueType,
  DBNamesWithPropertyType,
  PropertyTypeEnum,
  NotionPageMetadataKeys,
  NotionPageMetadataKeyEnum,
  MutPropertyTypeEnum,
  NotionMutPageMetadataKeys,
  PropertyType,
} from "./types";

function isAllFullPage(
  results: (
    | PageObjectResponse
    | PartialPageObjectResponse
    | DataSourceObjectResponse
    | PartialDataSourceObjectResponse
  )[],
): results is PageObjectResponse[] {
  return results.every(isFullPage);
}

function isMetadataType(
  type: PropertyTypeEnum,
): type is NotionPageMetadataKeyEnum {
  return type.startsWith("__");
}

async function processRow<T extends DBSchemaType>(
  page: PageObjectResponse,
  schema: T,
  client: Client,
): Promise<DBInfer<T>> {
  const transformedResult = {} as DBInfer<T>;
  for (const [key, def] of Object.entries(schema) as [
    keyof T,
    DBSchemaValueDef,
  ][]) {
    const type: PropertyTypeEnum = def.type;
    let property: PropertyType<typeof type>;
    let value: ValueType<typeof type>;
    if (isMetadataType(type)) {
      // Get page metadata
      const rawKey = type.slice(2) as NotionPageMetadataKeys;
      property = page[rawKey];
      value = page[rawKey];
    } else {
      // Get page property
      const name = def.propertyName ?? key.toString();
      if (!(name in page.properties)) {
        throw Error(`Property ${name} is not found`);
      }
      property = page.properties[name];
      if (property.type !== type) {
        throw Error(
          `Property ${name} type mismatch: ${property.type} !== ${type}`,
        );
      }
      // @ts-expect-error
      value = property[type];
    }
    const handler = def.handler as ValueHandler<typeof type>;
    transformedResult[key] = await Promise.resolve(
      handler(value, { property, page, client }),
    );
  }
  return transformedResult;
}

async function processRows<T extends DBSchemaType>(
  results: PageObjectResponse[],
  schema: T,
  client: Client,
): Promise<DBInfer<T>[]> {
  const processedResults = [] as DBInfer<T>[];
  for (const result of results) {
    processedResults.push(await processRow(result, schema, client));
  }
  return processedResults;
}

function processKVResults<
  T extends DBSchemaType,
  K extends keyof T,
  V extends keyof T,
>(processedResults: DBInfer<T>[], keyProp: K, valueProp: V) {
  const result: Record<string, DBInfer<T>[V]> = {};
  for (const processedResult of processedResults) {
    const key = processedResult[keyProp];
    if (typeof key !== "string") {
      throw Error("Key is not a string");
    }
    result[key] = processedResult[valueProp];
  }
  return result;
}

type MutateParameters = {
  [K in NotionMutPageMetadataKeys]: UpdatePageParameters[K];
} & {
  properties: NotionMutProperties;
};

function createMutateData<T extends DBSchemaType>(
  data: DBMutateInfer<T>,
  schema: T,
): MutateParameters {
  const parameters = { properties: {} } as MutateParameters;
  for (const [key, value] of Object.entries(data) as [keyof T, any][]) {
    const def: DBSchemaValueDef = schema[key];
    if (!("composer" in def)) {
      throw Error(
        `Cannot mutate property '${String(key)}' of type '${def.type}': it has no composer`,
      );
    }
    const type: MutPropertyTypeEnum = def.type;
    if (isMetadataType(type)) {
      const key = type.slice(2) as NotionMutPageMetadataKeys;
      const composer = def.composer as ValueComposer<typeof type>;
      // @ts-expect-error -- TS cannot infer that key is of type NotionMutPageMetadataKeys
      parameters[key] = composer(value);
    } else {
      const name = def.propertyName ?? key.toString();
      const composer = def.composer as ValueComposer<typeof type>;
      // @ts-expect-error -- TS cannot infer that parameters.properties[name] is of type matching composer output
      parameters.properties[name] = composer(value);
    }
  }
  return parameters;
}

type NotionTokenOptions = {
  /**
   * The token for the Notion API client.
   */
  notionToken: string;
};
type NotionClientOptions = {
  /**
   * The Notion API client. Make sure the version is set to '2025-09-03'.
   */
  notionClient: Client;
};
type SchemasOptions<DBS extends DBSchemasType> = {
  /**
   * The schemas of all databases.
   */
  dbSchemas: DBS;
};
type AutoDetectOptions = {
  autoDetectDataSources: {
    /**
     * The ID of the page containing all databases.
     */
    pageId: string;
    /**
     * The prefix of the database titles. Will be omitted when querying databases.
     */
    dataSourcePrefix?: string;
  };
};
type DataSourceMapOptions = {
  /**
   * The map of datasource names to their IDs. If provided, the client use this map directly.
   */
  dataSourceMap: Record<string, string>;
};

/**
 * Options for the Notion CMS Adapter client.
 *
 * @typeParam DBS - The type of schemas for multiple Notion databases.
 */
export type NotionDBClientOptions<DBS extends DBSchemasType> = (
  | NotionTokenOptions
  | NotionClientOptions
) &
  SchemasOptions<DBS> &
  (AutoDetectOptions | DataSourceMapOptions);

function createClient<DBS extends DBSchemasType>(
  options: NotionDBClientOptions<DBS>,
) {
  if ("notionClient" in options) {
    return options.notionClient;
  } else if ("notionToken" in options) {
    return new Client({
      auth: options.notionToken,
      notionVersion: "2025-09-03",
    });
  } else {
    throw Error("At least one of notionToken or notionClient must be provided");
  }
}

const DEFAULT_DB_PREFIX = "db: ";

function createUseDatabaseFunction<DBS extends DBSchemasType>(
  options: NotionDBClientOptions<DBS>,
  client: Client,
) {
  type DBName = keyof DBS;
  if ("dataSourceMap" in options) {
    return async <R>(
      name: DBName,
      callback: (id: string) => Promise<R>,
    ): Promise<R> => {
      const rawName = (name as string).split("__")[0];
      if (!(rawName in options.dataSourceMap)) {
        throw Error("Database not found");
      }
      const id = options.dataSourceMap[rawName];
      return await callback(id);
    };
  } else if ("autoDetectDataSources" in options) {
    const {
      autoDetectDataSources: { pageId, dataSourcePrefix = DEFAULT_DB_PREFIX },
    } = options;

    const dataSourceIdMap = new Map<string, string>();

    const fillDatabaseIdMap = async () => {
      const databases = await collectPaginatedAPI(client.blocks.children.list, {
        block_id: pageId,
      });
      for (const database of databases) {
        if (isFullBlock(database) && database.type === "child_database") {
          const result = await client.databases.retrieve({
            database_id: database.id,
          });
          if ("data_sources" in result) {
            for (const dataSource of result.data_sources) {
              const title = dataSource.name;
              if (title.startsWith(dataSourcePrefix)) {
                dataSourceIdMap.set(
                  title.slice(dataSourcePrefix.length),
                  dataSource.id,
                );
              }
            }
          }
        }
      }
    };

    const getDatabaseId = async (rawName: string) => {
      if (!dataSourceIdMap.has(rawName)) {
        await fillDatabaseIdMap();
      }
      const id = dataSourceIdMap.get(rawName);
      if (!id) {
        throw Error("Database not found");
      }
      return id;
    };

    return async <R>(
      name: DBName,
      callback: (id: string) => Promise<R>,
    ): Promise<R> => {
      try {
        const rawName = (name as string).split("__")[0];
        const id = await getDatabaseId(rawName);
        return await callback(id);
      } catch (e) {
        dataSourceIdMap.clear();
        throw e;
      }
    };
  } else {
    throw Error("At least one of dbMap or dbPageId must be provided");
  }
}

/**
 * Query parameters. Same as Notions API query parameters but without `database_id` and `filter_properties`.
 */
export type NotionDBQueryParameters = Pick<
  QueryDataSourceParameters,
  "filter" | "sorts" | "in_trash" | "archived"
>;
/**
 * Adds the content of a page to the type of the object.
 */
export type TypeWithContent<T, C extends string> = T &
  Record<C, NotionPageContent>;

/**
 * Create a Notion CMS Adapter client.
 *
 * @param options - Options for the client.
 * @returns The client.
 */
export function createNotionDBClient<DBS extends DBSchemasType>(
  options: NotionDBClientOptions<DBS>,
) {
  const { dbSchemas } = options;

  type DBName = keyof DBS;
  type S = typeof dbSchemas;

  const client = createClient(options);
  const useDataSourceId = createUseDatabaseFunction(options, client);

  async function assertPageInDatabase(db: DBName, pageId: string) {
    await useDataSourceId(db, async (id) => {
      const page = await client.pages.retrieve({
        page_id: pageId,
      });
      if (!isFullPage(page)) {
        throw Error("Not a full page");
      }
      if (
        page.parent.type !== "database_id" ||
        page.parent.database_id !== id
      ) {
        throw Error("Page not found in database");
      }
    });
  }

  return {
    /**
     * Reference of underlying Notion client.
     */
    notionClient: client,

    /**
     * Query a database.
     *
     * @param db The name of the database.
     * @param params The query parameters.
     * @param limit The maximum number of results to return (max 100). If not provided, all results will be returned.
     */
    async query<T extends DBName>(
      db: T,
      params: NotionDBQueryParameters = {},
      limit?: number,
    ): Promise<DBInfer<S[T]>[]> {
      return useDataSourceId(db, async (id) => {
        let results: (
          | PageObjectResponse
          | PartialPageObjectResponse
          | DataSourceObjectResponse
          | PartialDataSourceObjectResponse
        )[];
        if (limit) {
          results = (
            await client.dataSources.query({
              ...params,
              data_source_id: id,
              page_size: limit,
            })
          ).results;
        } else {
          results = await collectPaginatedAPI(client.dataSources.query, {
            ...params,
            data_source_id: id,
          });
        }
        if (!isAllFullPage(results)) {
          throw Error("Not all results are full page");
        }
        return await processRows(results, dbSchemas[db], client);
      });
    },

    /**
     * Query a database and return the first result only.
     *
     * @param db The name of the database.
     * @param params The query parameters.
     */
    async queryFirst<T extends DBName>(
      db: T,
      params: NotionDBQueryParameters = {},
    ): Promise<DBInfer<S[T]> | undefined> {
      const results = await this.query(db, params, 1);
      return results[0];
    },

    /**
     * Query a page by Notion page ID.
     *
     * @param db The name of the database.
     * @param id The ID of the page.
     */
    async queryOneById<T extends DBName>(
      db: T,
      id: string,
    ): Promise<DBInfer<S[T]>> {
      return useDataSourceId(db, async (dbId) => {
        const response = await client.pages.retrieve({
          page_id: id,
        });
        if (!isFullPage(response)) {
          throw Error("Not a full page");
        }
        if (
          response.parent.type !== "database_id" ||
          response.parent.database_id !== dbId
        ) {
          throw Error("Page not found in database");
        }
        return await processRow(response, dbSchemas[db], client);
      });
    },

    /**
     * Query content of a page by Notion page ID.
     *
     * @param id The ID of the page.
     */
    async queryPageContentById(id: string): Promise<NotionPageContent> {
      return await collectPaginatedAPI(client.blocks.children.list, {
        block_id: id,
      });
    },

    /**
     * Query a page and its content by Notion page ID.
     *
     * @param db The name of the database.
     * @param id The unique ID of the page.
     * @param contentProperty The property name to store the content.
     */
    async queryOneWithContentById<T extends DBName, C extends string>(
      db: T,
      id: string,
      contentProperty: C,
    ): Promise<TypeWithContent<DBInfer<S[T]>, C>> {
      const [properties, content] = await Promise.all([
        this.queryOneById(db, id),
        this.queryPageContentById(id),
      ]);
      const append = {} as Record<C, NotionPageContent>;
      append[contentProperty] = content;
      return Object.assign(properties, append);
    },

    /**
     * Query a page by unique ID.
     *
     * @param db The name of the database.
     * @param unique_id The unique ID of the page.
     */
    async queryOneByUniqueId<T extends DBNamesWithPropertyType<S, "unique_id">>(
      db: T,
      unique_id: number,
    ): Promise<DBInfer<S[T]> | undefined> {
      const uniqueIdProp = Object.entries(dbSchemas[db]).find(
        ([_, type]) => type.type === "unique_id",
      )![0];
      return this.queryFirst(db, {
        filter: {
          property: uniqueIdProp,
          unique_id: {
            equals: unique_id,
          },
        },
      });
    },

    /**
     * Query a page and its content by unique ID.
     *
     * @param db The name of the database.
     * @param unique_id The unique ID of the page.
     * @param contentProperty The property name to store the content.
     */
    async queryOneWithContentByUniqueId<
      T extends DBNamesWithPropertyType<S, "unique_id">,
      C extends string,
    >(
      db: T,
      unique_id: number,
      contentProperty: C,
    ): Promise<TypeWithContent<DBInfer<S[T]>, C>> {
      return useDataSourceId(db, async (dbId) => {
        const uniqueIdProp = Object.entries(dbSchemas[db]).find(
          ([_, type]) => type.type === "unique_id",
        )![0];
        const response = await client.dataSources.query({
          data_source_id: dbId,
          filter: {
            property: uniqueIdProp,
            unique_id: {
              equals: unique_id,
            },
          },
        });
        if (response.results.length === 0) {
          throw Error("Not found");
        }
        const uniqueResult = response.results[0];
        if (!isFullPage(uniqueResult)) {
          throw Error("Not a full page");
        }
        const blockResponse = await client.blocks.children.list({
          block_id: uniqueResult.id,
        });

        const result = await processRow(uniqueResult, dbSchemas[db], client);
        const append = {} as Record<C, NotionPageContent>;
        append[contentProperty] = blockResponse.results;
        return Object.assign(result, append);
      });
    },

    /**
     * Convert the content of a database into a key-value pair using designated key and value fields.
     *
     * @param db The name of the database.
     * @param keyProp The name of the key field.
     * @param valueProp The name of the value field.
     */
    async queryKV<
      T extends DBName,
      DB extends DBInfer<S[T]>,
      F extends KeysWithValueType<DB, string>,
      G extends keyof DB,
      R extends Record<string, DB[G]>,
    >(db: T, keyProp: F, valueProp: G): Promise<R> {
      return useDataSourceId(db, async (id) => {
        const results = await collectPaginatedAPI(client.dataSources.query, {
          data_source_id: id,
        });
        if (!isAllFullPage(results)) {
          throw Error("Not all results are full page");
        }
        const processedResults = await processRows(
          results,
          dbSchemas[db],
          client,
        );
        return processKVResults(
          processedResults,
          keyProp as string,
          valueProp as string,
        ) as R;
      });
    },

    /**
     * Query the content of a page by title. If title is not unique, the first page found will be returned.
     *
     * @param db The name of the database.
     * @param title The title of the page.
     */
    async queryText<T extends DBNamesWithPropertyType<S, "title">>(
      db: T,
      title: string,
    ): Promise<NotionPageContent> {
      return useDataSourceId(db, async (id) => {
        const titleProp = Object.entries(dbSchemas[db]).find(
          ([_, type]) => type.type === "title",
        )![0];
        const response = await client.dataSources.query({
          data_source_id: id,
          filter: {
            property: titleProp,
            title: {
              equals: title,
            },
          },
          page_size: 1,
        });
        if (response.results.length === 0) {
          throw Error("Not found");
        }
        const uniqueResult = response.results[0];
        const blockResponse = await client.blocks.children.list({
          block_id: uniqueResult.id,
        });
        return blockResponse.results;
      });
    },

    /**
     * Insert an entry into a database.
     *
     * @param db The name of the database.
     * @param data The data to insert.
     */
    async insertEntry<T extends DBName>(
      db: T,
      data: DBMutateInfer<S[T]>,
    ): Promise<DBInfer<S[T]>> {
      return useDataSourceId(db, async (id) => {
        const result = await client.pages.create({
          parent: {
            data_source_id: id,
          },
          ...createMutateData(data, dbSchemas[db]),
        });
        if (!("properties" in result)) {
          throw Error("Not a full page");
        }
        return await processRow(result, dbSchemas[db], client);
      });
    },

    /**
     * Update an entry in a database. Will throw an error if the page is not found in the database.
     *
     * @param db The name of the database.
     * @param id The ID of the page.
     * @param data The data to update.
     */
    async updateEntry<T extends DBName>(
      db: T,
      id: string,
      data: DBMutateInfer<S[T]>,
    ): Promise<DBInfer<S[T]>> {
      await assertPageInDatabase(db, id);
      const result = await client.pages.update({
        page_id: id,
        ...createMutateData(data, dbSchemas[db]),
      });
      if (!("properties" in result)) {
        throw Error("Not a full page");
      }
      return await processRow(result, dbSchemas[db], client);
    },

    /**
     * Delete an entry in a database. Will throw an error if the page is not found in the database.
     *
     * @param db The name of the database.
     * @param id The ID of the page.
     */
    async deleteEntry(db: DBName, id: string): Promise<void> {
      await assertPageInDatabase(db, id);
      await client.pages.update({
        page_id: id,
        in_trash: true,
      });
    },
  } as const;
}
