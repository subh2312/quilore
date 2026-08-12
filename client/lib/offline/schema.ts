import { appSchema, tableSchema } from "@nozbe/watermelondb";

export const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: "workouts",
      columns: [
        { name: "payload_json", type: "string" },
        { name: "updated_at", type: "number" },
      ],
    }),
    tableSchema({
      name: "meals",
      columns: [
        { name: "payload_json", type: "string" },
        { name: "updated_at", type: "number" },
      ],
    }),
    tableSchema({
      name: "plans",
      columns: [
        { name: "payload_json", type: "string" },
        { name: "updated_at", type: "number" },
      ],
    }),
    tableSchema({
      name: "sync_queue",
      columns: [
        { name: "collection_name", type: "string" },
        { name: "op", type: "string" },
        { name: "payload_json", type: "string" },
        { name: "created_at", type: "number" },
      ],
    }),
  ],
});
