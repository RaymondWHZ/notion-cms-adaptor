import type {
  MutPropertyDef,
  MutPropertyTypeEnum,
  PropertyDef,
  PropertyTypeEnum,
  DBSchemasType,
  MutValueType,
  NotionMutPageMetadataKeys,
  NotionPageMetadataKeys,
  NotionPropertyDef,
  PropertyInfer,
  ValueComposer,
  ValueHandler,
  ValueType,
} from "./types";
import type { RichTextItemResponse } from "@notionhq/client/build/src/api-endpoints";

/**
 * A type safe way to define database schemas. Directly return the schema object.
 * @param schema The schema object
 */
export function createDBSchemas<T extends DBSchemasType>(
  schema: T,
): typeof schema {
  return schema;
}

/**
 * Convert a list of rich text items to a plain text string.
 * @param arr The list of rich text items
 */
export function packPlainText(arr: RichTextItemResponse[]): string {
  return arr.reduce((acc, cur) => acc + cur.plain_text, "");
}

/**
 * Rewrite the preSignedUrl to use Notion's image optimization service, assuming the preSignedUrl is a Notion image.
 *
 * This is not an official API and may break at any time. Use at your own risk.
 *
 * @param pageId The id of the page containing the image
 * @param preSignedUrl The preSignedUrl of the image
 */
export function convertNotionImage(pageId: string, preSignedUrl: string) {
  return (
    "https://www.notion.so/image/" +
    encodeURIComponent(preSignedUrl.split("?")[0]) +
    "?id=" +
    pageId +
    "&table=block"
  );
}

export interface DefaultPropertyDef<T extends PropertyTypeEnum> {
  type: T;
  propertyName?: string;
  handler: ValueHandler<T, ValueType<T>>;
  raw(): PropertyDef<T, ValueType<T>>;
  rawWithDefault(
    defaultValue: NonNullable<ValueType<T>>,
  ): PropertyDef<T, NonNullable<ValueType<T>>>;
  handleUsing<R>(handler: ValueHandler<T, R>): PropertyDef<T, R>;
}

const makeDefaultOptions = <T extends PropertyTypeEnum>(
  type: T,
  propertyName?: string,
): DefaultPropertyDef<T> => {
  const valueToRaw: PropertyDef<T, ValueType<T>> = {
    type,
    propertyName,
    handler: (value) => value,
  };
  return {
    /**
     * Expand the default options, so that the object itself can be used as a definition.
     */
    ...valueToRaw,
    /**
     * Directly return the raw value. Does not support mutation.
     *
     * It is now the same as simply omitting this raw() method call.
     */
    raw() {
      return valueToRaw;
    },
    /**
     * Directly return the raw value with a default value if the value is null or undefined. Does not support mutation.
     * @param defaultValue The default value
     */
    rawWithDefault(defaultValue) {
      return {
        type,
        propertyName,
        handler: (value) => value ?? defaultValue,
      };
    },
    /**
     * Handle the value using a custom handler. Does not support mutation.
     * @param handler The custom handler
     */
    handleUsing(handler) {
      return {
        type,
        propertyName,
        handler,
      };
    },
  };
};

export interface DefaultMutPropertyDef<T extends MutPropertyTypeEnum> {
  type: T;
  propertyName?: string;
  handler: ValueHandler<T, ValueType<T>>;
  composer: ValueComposer<T, MutValueType<T>>;
  raw(): MutPropertyDef<T, ValueType<T>, MutValueType<T>>;
  rawWithDefault(
    defaultValue: NonNullable<ValueType<T>>,
  ): MutPropertyDef<T, NonNullable<ValueType<T>>, MutValueType<T>>;
  handleUsing<R>(
    handler: ValueHandler<T, R>,
  ): MutPropertyDef<T, R, MutValueType<T>>;
  handleAndComposeUsing<R, I = R>(options: {
    handler: ValueHandler<T, R>;
    composer: ValueComposer<T, I>;
  }): MutPropertyDef<T, R, I>;
}

const makeMutableDefaultOptions = <T extends MutPropertyTypeEnum>(
  type: T,
  propertyName?: string,
): DefaultMutPropertyDef<T> => {
  const valueToRaw: MutPropertyDef<T, ValueType<T>, MutValueType<T>> = {
    type,
    propertyName,
    handler: (value) => value,
    composer: (value) => value,
  };
  return {
    /**
     * Expand the default options, so that the object itself can be used as a definition.
     */
    ...valueToRaw,
    /**
     * Directly return the raw value. Supports mutation.
     *
     * It is now the same as simply omitting this raw() method call.
     */
    raw() {
      return valueToRaw;
    },
    /**
     * Directly return the raw value with a default value if the value is null or undefined. Supports mutation.
     * @param defaultValue The default value
     */
    rawWithDefault(defaultValue) {
      return {
        type,
        propertyName,
        handler: (value) => value ?? defaultValue,
        composer: (value) => value,
      };
    },
    /**
     * Handle the value using a custom handler. Supports mutation using the raw underlying value.
     * @param handler The custom handler
     */
    handleUsing(handler) {
      return {
        type,
        propertyName,
        handler,
        composer: (value) => value,
      };
    },
    /**
     * Handle the value using a custom handler. Supports mutation via a custom composer.
     * @param handler The custom handler
     * @param composer The custom composer
     */
    handleAndComposeUsing({ handler, composer }) {
      return {
        type,
        propertyName,
        handler,
        composer,
      };
    },
  };
};

function isMutableMetadataKey(
  key: NotionPageMetadataKeys,
): key is NotionMutPageMetadataKeys {
  // These are the mutable metadata keys from UpdatePageParameters
  const mutableKeys: NotionMutPageMetadataKeys[] = [
    "in_trash",
    "is_locked",
    "icon",
    "cover",
  ];
  return mutableKeys.includes(key as NotionMutPageMetadataKeys);
}

/**
 * Reference a metadata key. Automatically returns a mutable definition if the key is mutable.
 */
export function metadata<T extends NotionPageMetadataKeys>(
  key: T,
): T extends NotionMutPageMetadataKeys
  ? DefaultMutPropertyDef<`__${T}`>
  : DefaultPropertyDef<`__${T}`> {
  if (isMutableMetadataKey(key)) {
    return makeMutableDefaultOptions(`__${key}`) as any;
  }
  return makeDefaultOptions(`__${key}`) as any;
}

const __idOptions = metadata("id");

/**
 * Reference the id metadata. Same as using 'metadata("id")'.
 */
export function __id() {
  return __idOptions;
}

export interface DefaultCheckboxDef extends DefaultMutPropertyDef<"checkbox"> {
  boolean(): MutPropertyDef<"checkbox", boolean>;
}

/**
 * Define a checkbox property.
 * @param propertyName Optional property name in Notion (if different from TypeScript attribute name)
 */
export function checkbox(propertyName?: string): DefaultCheckboxDef {
  return {
    ...makeMutableDefaultOptions("checkbox", propertyName),
    /**
     * Convert the value to a boolean. Supports mutation.
     */
    boolean() {
      return this.raw();
    },
  };
}

export interface DefaultCreatedByDef extends DefaultPropertyDef<"created_by"> {
  name(): PropertyDef<"created_by", string>;
}

/**
 * Define a created_by property.
 * @param propertyName Optional property name in Notion (if different from TypeScript attribute name)
 */
export function created_by(propertyName?: string): DefaultCreatedByDef {
  return {
    ...makeDefaultOptions("created_by", propertyName),
    /**
     * Get the name of the creator. Does not support mutation.
     */
    name() {
      return this.handleUsing((value) =>
        "name" in value ? (value.name ?? "") : "",
      );
    },
  };
}

export interface DefaultCreatedTimeDef extends DefaultPropertyDef<"created_time"> {
  timeString(): PropertyDef<"created_time", string>;
}

/**
 * Define a created_time property.
 * @param propertyName Optional property name in Notion (if different from TypeScript attribute name)
 */
export function created_time(propertyName?: string): DefaultCreatedTimeDef {
  return {
    ...makeDefaultOptions("created_time", propertyName),
    /**
     * Get the time string of the creation time. Does not support mutation.
     */
    timeString() {
      return this.raw();
    },
  };
}

export type DateRange = {
  start: string;
  end: string;
};

export interface DefaultDateDef extends DefaultMutPropertyDef<"date"> {
  startDate(): MutPropertyDef<"date", string>;
  dateRange(): MutPropertyDef<"date", DateRange>;
}

/**
 * Define a date property.
 * @param propertyName Optional property name in Notion (if different from TypeScript attribute name)
 */
export function date(propertyName?: string): DefaultDateDef {
  return {
    ...makeMutableDefaultOptions("date", propertyName),
    /**
     * Get the start date of the date range, defaults to empty string. Supports mutation.
     */
    startDate() {
      return this.handleAndComposeUsing({
        handler: (value) => value?.start ?? "",
        composer: (value) => ({ start: value }),
      });
    },
    /**
     * Get the date range. Supports mutation.
     */
    dateRange() {
      return this.handleAndComposeUsing<DateRange>({
        handler: (value) => {
          return {
            start: value?.start ?? "",
            end: value?.end ?? "",
          };
        },
        composer: (value) => value,
      });
    },
  };
}

export interface DefaultEmailDef extends DefaultMutPropertyDef<"email"> {
  string(): MutPropertyDef<"email", string, string | null>;
}

/**
 * Define an email property.
 * @param propertyName Optional property name in Notion (if different from TypeScript attribute name)
 */
export function email(propertyName?: string): DefaultEmailDef {
  return {
    ...makeMutableDefaultOptions("email", propertyName),
    /**
     * Get the email string. Supports mutation.
     */
    string() {
      return this.rawWithDefault("");
    },
  };
}

export interface DefaultFilesDef extends DefaultMutPropertyDef<"files"> {
  urls(): MutPropertyDef<"files", string[], MutValueType<"files">>;
  singleUrl(): MutPropertyDef<"files", string, MutValueType<"files">>;
  notionImageUrls(): MutPropertyDef<"files", string[], MutValueType<"files">>;
  singleNotionImageUrl(): MutPropertyDef<
    "files",
    string,
    MutValueType<"files">
  >;
}

/**
 * Define a files property.
 * @param propertyName Optional property name in Notion (if different from TypeScript attribute name)
 */
export function files(propertyName?: string): DefaultFilesDef {
  return {
    ...makeMutableDefaultOptions("files", propertyName),
    /**
     * Get the urls of the files. Supports mutation using the raw underlying value.
     */
    urls() {
      return this.handleUsing((value) =>
        value.reduce((acc, file) => {
          let result: string | undefined = undefined;
          if ("file" in file) {
            result = file.file.url;
          } else if ("external" in file) {
            result = file.external.url;
          }
          if (result === undefined) {
            return acc;
          }
          return acc.concat(result);
        }, [] as string[]),
      );
    },
    /**
     * Get the url of the first file. Supports mutation using the raw underlying value.
     */
    singleUrl() {
      return this.handleUsing((value) => {
        const file = value[0];
        if (!file) {
          return "";
        }
        if ("file" in file) {
          return file.file.url;
        } else if ("external" in file) {
          return file.external.url;
        }
        return "";
      });
    },
    /**
     * Rewrite the preSignedUrl to use Notion's image optimization service, assuming the preSignedUrl is a Notion image.
     *
     * This is not an official API and may break at any time. Use at your own risk.
     */
    notionImageUrls() {
      return this.handleUsing((value, { page: { id } }) =>
        value.reduce((acc, file) => {
          let result: string | undefined = undefined;
          if ("file" in file) {
            result = convertNotionImage(id, file.file.url);
          }
          if (result === undefined) {
            return acc;
          }
          return acc.concat(result);
        }, [] as string[]),
      );
    },
    /**
     * Rewrite the preSignedUrl of the first image to use Notion's image optimization service, assuming the preSignedUrl is a Notion image.
     *
     * This is not an official API and may break at any time. Use at your own risk.
     */
    singleNotionImageUrl() {
      return this.handleUsing((value, { page: { id } }) => {
        const file = value[0];
        if (!file) {
          return "";
        }
        if ("file" in file) {
          return convertNotionImage(id, file.file.url);
        }
        return "";
      });
    },
  };
}

export interface DefaultFormulaDef extends DefaultPropertyDef<"formula"> {
  string(): PropertyDef<"formula", string>;
  booleanDefaultFalse(): PropertyDef<"formula", boolean>;
  numberDefaultZero(): PropertyDef<"formula", number>;
  dateRange(): PropertyDef<"formula", DateRange>;
}

/**
 * Define a formula property.
 * @param propertyName Optional property name in Notion (if different from TypeScript attribute name)
 */
export function formula(propertyName?: string): DefaultFormulaDef {
  return {
    ...makeDefaultOptions("formula", propertyName),
    /**
     * Convert the value to string. Does not support mutation.
     */
    string() {
      return this.handleUsing((value) => {
        if (value.type === "string") {
          return value.string ?? "";
        } else if (value.type === "number") {
          return value.number?.toString() ?? "";
        } else if (value.type === "boolean") {
          return value.boolean ? "true" : "false";
        } else if (value.type === "date") {
          return value.date?.start ?? "";
        }
        return "";
      });
    },
    /**
     * If the value is boolean and is true, return true; otherwise return false. Does not support mutation.
     */
    booleanDefaultFalse() {
      return this.handleUsing((value) =>
        value.type === "boolean" ? (value.boolean ?? false) : false,
      );
    },
    /**
     * If the value is number, return the number; otherwise return 0. Does not support mutation.
     */
    numberDefaultZero() {
      return this.handleUsing((value) =>
        value.type === "number" ? (value.number ?? 0) : 0,
      );
    },
    /**
     * If the value is date, return the date range; otherwise return a data range with empty start and end. Does not support mutation.
     */
    dateRange() {
      return this.handleUsing((value) => {
        if (value.type === "date") {
          return {
            start: value.date?.start ?? "",
            end: value.date?.end ?? "",
          };
        }
        return {
          start: "",
          end: "",
        };
      });
    },
  };
}

export interface DefaultLastEditedByDef extends DefaultPropertyDef<"last_edited_by"> {
  name(): PropertyDef<"last_edited_by", string>;
}

/**
 * Define a last_edited_by property.
 * @param propertyName Optional property name in Notion (if different from TypeScript attribute name)
 */
export function last_edited_by(propertyName?: string): DefaultLastEditedByDef {
  return {
    ...makeDefaultOptions("last_edited_by", propertyName),
    /**
     * Get the name of the last editor. Does not support mutation.
     */
    name() {
      return this.handleUsing((value) =>
        "name" in value ? (value.name ?? "") : "",
      );
    },
  };
}

export interface DefaultLastEditedTimeDef extends DefaultPropertyDef<"last_edited_time"> {
  timeString(): PropertyDef<"last_edited_time", string>;
}

/**
 * Define a last_edited_time property.
 * @param propertyName Optional property name in Notion (if different from TypeScript attribute name)
 */
export function last_edited_time(
  propertyName?: string,
): DefaultLastEditedTimeDef {
  return {
    ...makeDefaultOptions("last_edited_time", propertyName),
    /**
     * Get the time string of the last edit time. Does not support mutation.
     */
    timeString() {
      return this.raw();
    },
  };
}

export interface DefaultMultiSelectDef extends DefaultMutPropertyDef<"multi_select"> {
  strings(): MutPropertyDef<"multi_select", string[]>;
  stringEnums<T extends string>(
    ...values: T[]
  ): MutPropertyDef<"multi_select", T[]>;
}

/**
 * Define a multi_select property.
 * @param propertyName Optional property name in Notion (if different from TypeScript attribute name)
 */
export function multi_select(propertyName?: string): DefaultMultiSelectDef {
  return {
    ...makeMutableDefaultOptions("multi_select", propertyName),
    /**
     * Get the names of the options. Supports mutation.
     */
    strings() {
      return this.handleAndComposeUsing({
        handler: (value) => value.map((option) => option.name),
        composer: (value) => value.map((name) => ({ name })),
      });
    },
    /**
     * Get the names of the options, validating that they are in the provided list of values. Supports mutation.
     */
    stringEnums<T extends string>(
      ...values: T[]
    ): MutPropertyDef<"multi_select", T[]> {
      return this.handleAndComposeUsing({
        handler: (value) => {
          const names = value.map((option) => option.name);
          if (!names.every((name) => values.includes(name as T))) {
            throw Error("Invalid status");
          }
          return names as T[];
        },
        composer: (value) => {
          if (!value.every((name) => values.includes(name))) {
            throw Error("Invalid status");
          }
          return value.map((name) => ({ name }));
        },
      });
    },
  };
}

export interface DefaultNumberDef extends DefaultMutPropertyDef<"number"> {
  numberDefaultZero(): MutPropertyDef<"number", number, number | null>;
}

/**
 * Define a number property.
 * @param propertyName Optional property name in Notion (if different from TypeScript attribute name)
 */
export function number(propertyName?: string): DefaultNumberDef {
  return {
    ...makeMutableDefaultOptions("number", propertyName),
    /**
     * If the value is number, return the number; otherwise return 0. Supports mutation.
     */
    numberDefaultZero() {
      return this.rawWithDefault(0);
    },
  };
}

export interface DefaultPeopleDef extends DefaultMutPropertyDef<"people"> {
  names(): MutPropertyDef<"people", string[], MutValueType<"people">>;
}

/**
 * Define a people property.
 * @param propertyName Optional property name in Notion (if different from TypeScript attribute name)
 */
export function people(propertyName?: string): DefaultPeopleDef {
  return {
    ...makeMutableDefaultOptions("people", propertyName),
    /**
     * Get the names of the people. Supports mutation using the raw underlying value.
     */
    names() {
      return this.handleUsing((value) =>
        value.reduce((acc, person) => {
          if ("name" in person) {
            return acc.concat(person.name ?? "");
          }
          return acc;
        }, [] as string[]),
      );
    },
  };
}

export interface DefaultPhoneNumberDef extends DefaultMutPropertyDef<"phone_number"> {
  string(): MutPropertyDef<"phone_number", string, string | null>;
}

/**
 * Define a phone_number property.
 * @param propertyName Optional property name in Notion (if different from TypeScript attribute name)
 */
export function phone_number(propertyName?: string): DefaultPhoneNumberDef {
  return {
    ...makeMutableDefaultOptions("phone_number", propertyName),
    /**
     * Get the phone number string, default to empty string. Supports mutation.
     */
    string() {
      return this.rawWithDefault("");
    },
  };
}

export interface RollupMappingItem {
  rollupField: string;
  def: NotionPropertyDef;
}
export interface RollupMapping {
  [key: string]: RollupMappingItem | PropertyDef<"__id">;
}
export type InferObject<T extends RollupMapping> = {
  [K in keyof T]: T[K] extends RollupMappingItem
    ? PropertyInfer<T[K]["def"]>
    : T[K] extends PropertyDef<"__id">
      ? PropertyInfer<T[K]>
      : never;
};

export interface DefaultRelationDef extends DefaultMutPropertyDef<"relation"> {
  ids(): MutPropertyDef<"relation", string[]>;
  singleId(): MutPropertyDef<"relation", string>;
  objects<M extends RollupMapping>(
    mapping: M,
  ): MutPropertyDef<"relation", InferObject<M>[], string[]>;
}

/**
 * Define a relation property.
 * @param propertyName Optional property name in Notion (if different from TypeScript attribute name)
 */
export function relation(propertyName?: string): DefaultRelationDef {
  return {
    ...makeMutableDefaultOptions("relation", propertyName),
    /**
     * Get the ids of the relations. Supports mutation.
     */
    ids() {
      return this.handleAndComposeUsing({
        handler: (value) => value.map((relation) => relation.id),
        composer: (value) => value.map((id) => ({ id })),
      });
    },
    /**
     * Get the first id of the relations. Supports mutation.
     */
    singleId() {
      return this.handleAndComposeUsing({
        handler: (value) => value[0].id,
        composer: (value) => [{ id: value }],
      });
    },
    /**
     * Construct a list of objects from the relations using related rollup fields. Supports mutation using a list of ids.
     *
     * @param mapping
     */
    objects<M extends RollupMapping>(mapping: M) {
      return this.handleAndComposeUsing({
        handler: (value, { page }) => {
          const { properties } = page;
          return value.map(({ id }, index) => {
            const mappedObject = {} as InferObject<M>;
            Object.entries(mapping).forEach(([key, item]) => {
              if ("rollupField" in item) {
                const { rollupField, def } = item;
                const rollupProperty = properties[rollupField];
                if (
                  !rollupProperty ||
                  rollupProperty.type !== "rollup" ||
                  rollupProperty.rollup.type !== "array"
                ) {
                  throw Error("Invalid rollup field: " + rollupField);
                }
                const property = rollupProperty.rollup.array[index];
                if (property.type !== def.type) {
                  throw Error(
                    `Property ${rollupField} type mismatch: ${property.type} !== ${def.type}`,
                  );
                }
                // @ts-expect-error
                const value = property[def.type] as ValueType<typeof def.type>;
                const handler = def.handler as ValueHandler<typeof def.type>;
                // @ts-expect-error
                mappedObject[key] = handler(value, {});
              } else {
                if (item.type !== "__id") {
                  throw Error("Invalid relation mapping: " + key);
                }
                // @ts-expect-error
                mappedObject[key] = item.handler(id, {});
              }
            });
            return mappedObject;
          });
        },
        composer: (value: string[]) => value.map((id) => ({ id })),
      });
    },
  };
}

export interface DefaultRichTextDef extends DefaultMutPropertyDef<"rich_text"> {
  plainText(): MutPropertyDef<"rich_text", string>;
}

/**
 * Define a rich_text property.
 * @param propertyName Optional property name in Notion (if different from TypeScript attribute name)
 */
export function rich_text(propertyName?: string): DefaultRichTextDef {
  return {
    ...makeMutableDefaultOptions("rich_text", propertyName),
    /**
     * Get the plain text version of the field. Supports mutation.
     */
    plainText() {
      return this.handleAndComposeUsing({
        handler: (value) => packPlainText(value),
        composer: (value) => [{ text: { content: value } }],
      });
    },
  };
}

export type RollupArrayType = Extract<
  ValueType<"rollup">,
  { type: "array" }
>["array"];
export type RollupArrayItemType = RollupArrayType[number];

export interface DefaultRollupDef extends DefaultPropertyDef<"rollup"> {
  dateRange(): PropertyDef<"rollup", DateRange>;
  numberDefaultZero(): PropertyDef<"rollup", number>;
  handleSingleUsing<R>(
    handler: (value: RollupArrayItemType | undefined) => R,
  ): PropertyDef<"rollup", R>;
  handleArrayUsing<R>(
    handler: (value: RollupArrayType) => R,
  ): PropertyDef<"rollup", R>;
}

/**
 * Define a rollup property.
 * @param propertyName Optional property name in Notion (if different from TypeScript attribute name)
 */
export function rollup(propertyName?: string): DefaultRollupDef {
  return {
    ...makeDefaultOptions("rollup", propertyName),
    /**
     * If the value is date, return the date range; otherwise return a data range with empty start and end. Does not support mutation.
     */
    dateRange() {
      return this.handleUsing((value) => {
        if (value.type === "date") {
          return {
            start: value.date?.start ?? "",
            end: value.date?.end ?? "",
          };
        }
        return {
          start: "",
          end: "",
        };
      });
    },
    /**
     * If the value is number, return the number; otherwise return 0. Does not support mutation.
     */
    numberDefaultZero() {
      return this.handleUsing((value) => {
        if (value.type === "number") {
          return value.number ?? 0;
        }
        return 0;
      });
    },
    /**
     * If the value is an array, handle the first item using a custom handler, ignoring the rest; otherwise throw an error. Does not support mutation.
     *
     * @param handler The custom handler
     */
    handleSingleUsing<R>(
      handler: (value: RollupArrayItemType | undefined) => R,
    ) {
      return this.handleUsing((value) => {
        if (value.type === "array") {
          return handler(value.array[0]);
        }
        throw Error("Invalid rollup type");
      });
    },
    /**
     * If the value is an array, handle the array using a custom handler; otherwise throw an error. Does not support mutation.
     *
     * @param handler The custom handler
     */
    handleArrayUsing<R>(handler: (value: RollupArrayType) => R) {
      return this.handleUsing((value) => {
        if (value.type === "array") {
          return handler(value.array);
        }
        throw Error("Invalid rollup type");
      });
    },
  };
}

export interface DefaultSelectDef extends DefaultMutPropertyDef<"select"> {
  optionalString(): MutPropertyDef<"select", string | undefined>;
  stringEnum<T extends string | undefined>(
    ...values: T[]
  ): MutPropertyDef<"select", T>;
}

/**
 * Define a select property.
 * @param propertyName Optional property name in Notion (if different from TypeScript attribute name)
 */
export function select(propertyName?: string): DefaultSelectDef {
  return {
    ...makeMutableDefaultOptions("select", propertyName),
    /**
     * Get the name of the option. Supports mutation.
     */
    optionalString() {
      return this.handleAndComposeUsing({
        handler: (value) => value?.name,
        composer: (value) => (value ? { name: value } : null),
      });
    },
    /**
     * Get the name of the option, validating that it is in the provided list of values. Supports mutation.
     */
    stringEnum<T extends string | undefined>(
      ...values: T[]
    ): MutPropertyDef<"select", T> {
      return this.handleAndComposeUsing({
        handler: (value) => {
          const name = value?.name;
          if (!values.includes(name as T)) {
            throw Error("Invalid status: " + name);
          }
          return name as T;
        },
        composer: (value) => {
          if (!values.includes(value)) {
            throw Error("Invalid status: " + value);
          }
          return value ? { name: value } : null;
        },
      });
    },
  };
}

export interface DefaultStatusDef extends DefaultMutPropertyDef<"status"> {
  string(): MutPropertyDef<"status", string>;
  stringEnum<T extends string>(...values: T[]): MutPropertyDef<"status", T>;
}

/**
 * Define a status property.
 * @param propertyName Optional property name in Notion (if different from TypeScript attribute name)
 */
export function status(propertyName?: string): DefaultStatusDef {
  return {
    ...makeMutableDefaultOptions("status", propertyName),
    /**
     * Get the name of the status. Supports mutation.
     */
    string() {
      return this.handleAndComposeUsing({
        handler: (value) => value?.name ?? "",
        composer: (value) => ({ name: value }),
      });
    },
    /**
     * Get the name of the status, validating that it is in the provided list of values. Supports mutation.
     */
    stringEnum<T extends string>(...values: T[]) {
      return this.handleAndComposeUsing({
        handler: (value) => {
          const name = value?.name;
          if (!name || !values.includes(name as T)) {
            throw Error("Invalid status: " + name);
          }
          return name as T;
        },
        composer: (value: T) => {
          if (!value || !values.includes(value)) {
            throw Error("Invalid status: " + value);
          }
          return { name: value };
        },
      });
    },
  };
}

export interface DefaultTitleDef extends DefaultMutPropertyDef<"title"> {
  plainText(): MutPropertyDef<"title", string>;
}

/**
 * Define a title property.
 * @param propertyName Optional property name in Notion (if different from TypeScript attribute name)
 */
export function title(propertyName?: string): DefaultTitleDef {
  return {
    ...makeMutableDefaultOptions("title", propertyName),
    /**
     * Get the plain text version of the title. Supports mutation.
     */
    plainText() {
      return this.handleAndComposeUsing({
        handler: (value) => packPlainText(value),
        composer: (value) => [{ text: { content: value } }],
      });
    },
  };
}

export interface DefaultUrlDef extends DefaultMutPropertyDef<"url"> {
  string(): MutPropertyDef<"url", string, string | null>;
}

/**
 * Define an url property.
 * @param propertyName Optional property name in Notion (if different from TypeScript attribute name)
 */
export function url(propertyName?: string): DefaultUrlDef {
  return {
    ...makeMutableDefaultOptions("url", propertyName),
    /**
     * Get the url string, default to empty string. Supports mutation.
     */
    string() {
      return this.rawWithDefault("");
    },
  };
}

export interface DefaultUniqueIdDef extends DefaultPropertyDef<"unique_id"> {
  number(): PropertyDef<"unique_id", number>;
  stringWithPrefix(): PropertyDef<"unique_id", string>;
}

/**
 * Define a unique_id property.
 * @param propertyName Optional property name in Notion (if different from TypeScript attribute name)
 */
export function unique_id(propertyName?: string): DefaultUniqueIdDef {
  return {
    ...makeDefaultOptions("unique_id", propertyName),
    /**
     * Get the number of the unique id. Does not support mutation.
     */
    number() {
      return this.handleUsing((value) => value.number!);
    },
    /**
     * Get the string of the unique id with a prefix, same as how it is displayed in Notion. Does not support mutation.
     */
    stringWithPrefix() {
      return this.handleUsing((value) => {
        if (value.prefix) {
          return value.prefix + "-" + value.number!.toString();
        }
        return value.number!.toString();
      });
    },
  };
}

export type DefaultVerificationDef = DefaultPropertyDef<"verification">;

/**
 * Define a verification property.
 * @param propertyName Optional property name in Notion (if different from TypeScript attribute name)
 */
export function verification(propertyName?: string): DefaultVerificationDef {
  return makeDefaultOptions("verification", propertyName);
}
