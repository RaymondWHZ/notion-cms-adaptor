import { expect, test, spyOn } from "bun:test";
import { Client } from "@notionhq/client";
import {
  __id,
  checkbox,
  createDBSchemas,
  createNotionDBClient,
  metadata,
  multi_select,
  relation,
  rich_text,
} from "../src";
import {
  PageObjectResponse,
  QueryDataSourceResponse,
} from "@notionhq/client/build/src/api-endpoints";

const TEST_DB_ID = "0000";
const TEST_PAGE_ID = "0001";
const TEST_PAGE_RESPONSE = {
  id: TEST_PAGE_ID,
  object: "page",
  url: "", // necessary for the check 'isFullPage'
  properties: {
    tags: {
      type: "multi_select",
      multi_select: [
        {
          name: "personal",
        },
      ],
    },
    tasks: {
      type: "relation",
      relation: [
        {
          id: "0002",
        },
        {
          id: "0003",
        },
      ],
    },
    task_tags: {
      type: "rollup",
      rollup: {
        type: "array",
        array: [
          {
            type: "multi_select",
            multi_select: [
              {
                name: "active",
              },
            ],
          },
          {
            type: "multi_select",
            multi_select: [
              {
                name: "backlog",
              },
            ],
          },
        ],
      },
    },
  },
  in_trash: true,
};

const dbSchema = createDBSchemas({
  projects: {
    _id: __id(),
    tags: multi_select().stringEnums("personal", "work", "backlog"),
    _in_trash: metadata("in_trash"),
    tasks: relation().objects({
      _id: __id(),
      tags: {
        rollupField: "task_tags",
        def: multi_select().stringEnums("active", "backlog"),
      },
    }),
  },
});
const notionClient = new Client();
const client = createNotionDBClient({
  notionClient,
  dbSchemas: dbSchema,
  dataSourceMap: {
    projects: TEST_DB_ID,
  },
});

test("query", async () => {
  const query = spyOn(notionClient.dataSources, "query");
  query.mockImplementation(async () => {
    return {
      results: [TEST_PAGE_RESPONSE],
      has_more: false,
    } as unknown as QueryDataSourceResponse;
  });

  const res = await client.query("projects", {
    filter: {
      property: "tags",
      multi_select: {
        contains: "personal",
      },
    },
  });
  expect(notionClient.dataSources.query).toBeCalledTimes(1);
  expect(notionClient.dataSources.query).toBeCalledWith({
    data_source_id: TEST_DB_ID,
    filter: {
      property: "tags",
      multi_select: {
        contains: "personal",
      },
    },
    sorts: undefined,
  });
  expect(res).toBeArrayOfSize(1);
  expect(res[0]._id).toBe(TEST_PAGE_ID);
  expect(res[0].tags).toContain("personal");
  expect(res[0]._in_trash).toBe(true);
  expect(res[0].tasks).toBeArrayOfSize(2);
  expect(res[0].tasks[0]).toEqual({
    _id: "0002",
    tags: ["active"],
  });
  expect(res[0].tasks[1]).toEqual({
    _id: "0003",
    tags: ["backlog"],
  });

  query.mockRestore();
});

test("insert", async () => {
  const create = spyOn(notionClient.pages, "create");
  create.mockImplementation(async () => {
    return TEST_PAGE_RESPONSE as unknown as PageObjectResponse;
  });

  const res = await client.insertEntry("projects", {
    tags: ["personal"],
    _in_trash: true,
  });
  expect(notionClient.pages.create).toBeCalledTimes(1);
  expect(notionClient.pages.create).toBeCalledWith({
    parent: {
      data_source_id: TEST_DB_ID,
    },
    properties: {
      tags: [
        {
          name: "personal",
        },
      ],
    },
    in_trash: true,
  });
  expect(res._id).toBe(TEST_PAGE_ID);
  expect(res.tags).toContain("personal");
  expect(res._in_trash).toBe(true);

  create.mockRestore();
});

// Test custom property name functionality
const TEST_CUSTOM_NAME_DB_ID = "1000";
const TEST_CUSTOM_NAME_PAGE_ID = "1001";
const TEST_CUSTOM_NAME_PAGE_RESPONSE = {
  id: TEST_CUSTOM_NAME_PAGE_ID,
  object: "page",
  url: "",
  properties: {
    // Notion property name is "done" but TypeScript key is "isDone"
    done: {
      type: "checkbox",
      checkbox: true,
    },
    // Notion property name is "Description" but TypeScript key is "desc"
    Description: {
      type: "rich_text",
      rich_text: [{ plain_text: "Hello World" }],
    },
  },
  in_trash: false,
};

const customNameSchema = createDBSchemas({
  tasks: {
    _id: __id(),
    // Use custom property name "done" instead of TypeScript key "isDone"
    isDone: checkbox("done").boolean(),
    // Use custom property name "Description" instead of TypeScript key "desc"
    desc: rich_text("Description").plainText(),
  },
});

const customNameClient = createNotionDBClient({
  notionClient,
  dbSchemas: customNameSchema,
  dataSourceMap: {
    tasks: TEST_CUSTOM_NAME_DB_ID,
  },
});

test("query with custom property names", async () => {
  const query = spyOn(notionClient.dataSources, "query");
  query.mockImplementation(async () => {
    return {
      results: [TEST_CUSTOM_NAME_PAGE_RESPONSE],
    } as unknown as QueryDataSourceResponse;
  });

  const res = await customNameClient.query("tasks");
  expect(notionClient.dataSources.query).toBeCalledTimes(1);
  expect(res).toBeArrayOfSize(1);
  // TypeScript key is "isDone" but reads from Notion property "done"
  expect(res[0].isDone).toBe(true);
  // TypeScript key is "desc" but reads from Notion property "Description"
  expect(res[0].desc).toBe("Hello World");

  query.mockRestore();
});

test("insert with custom property names", async () => {
  const create = spyOn(notionClient.pages, "create");
  create.mockImplementation(async () => {
    return TEST_CUSTOM_NAME_PAGE_RESPONSE as unknown as PageObjectResponse;
  });

  const res = await customNameClient.insertEntry("tasks", {
    // TypeScript key is "isDone" but should write to Notion property "done"
    isDone: false,
    // TypeScript key is "desc" but should write to Notion property "Description"
    desc: "New task",
  });
  expect(notionClient.pages.create).toBeCalledTimes(1);
  expect(notionClient.pages.create).toBeCalledWith({
    parent: {
      data_source_id: TEST_CUSTOM_NAME_DB_ID,
    },
    properties: {
      // Should use Notion property name "done", not TypeScript key "isDone"
      done: false,
      // Should use Notion property name "Description", not TypeScript key "desc"
      Description: [{ text: { content: "New task" } }],
    },
  });
  expect(res._id).toBe(TEST_CUSTOM_NAME_PAGE_ID);

  create.mockRestore();
});
