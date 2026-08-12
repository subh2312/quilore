import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const OFFLINE_SCHEMA_VERSION = 1;

export const offlineSchema = appSchema({
  version: OFFLINE_SCHEMA_VERSION,
  tables: [
    tableSchema({
      name: 'workouts',
      columns: [
        { name: 'remote_id', type: 'string', isOptional: true },
        { name: 'payload_json', type: 'string' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'meals',
      columns: [
        { name: 'remote_id', type: 'string', isOptional: true },
        { name: 'payload_json', type: 'string' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'plans',
      columns: [
        { name: 'remote_id', type: 'string', isOptional: true },
        { name: 'payload_json', type: 'string' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'sync_queue',
      columns: [
        { name: 'collection', type: 'string' },
        { name: 'op', type: 'string' },
        { name: 'payload_json', type: 'string' },
        { name: 'created_at', type: 'number' },
      ],
    }),
  ],
});
