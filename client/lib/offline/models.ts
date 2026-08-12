import { Model } from "@nozbe/watermelondb";
import { field, text } from "@nozbe/watermelondb/decorators";

export class WorkoutRecord extends Model {
  static table = "workouts";
  @text("payload_json") payloadJson!: string;
  @field("updated_at") updatedAt!: number;
}

export class MealRecord extends Model {
  static table = "meals";
  @text("payload_json") payloadJson!: string;
  @field("updated_at") updatedAt!: number;
}

export class PlanRecord extends Model {
  static table = "plans";
  @text("payload_json") payloadJson!: string;
  @field("updated_at") updatedAt!: number;
}

export class SyncQueueRecord extends Model {
  static table = "sync_queue";
  @text("collection_name") collectionName!: string;
  @text("op") op!: string;
  @text("payload_json") payloadJson!: string;
  @field("created_at") createdAt!: number;
}
