import { Model } from "@nozbe/watermelondb";
import { field, text } from "@nozbe/watermelondb/decorators";

export class WorkoutRecord extends Model {
  static table = "workouts";
  @text("payload_json") declare payloadJson: string;
  @field("updated_at") declare updatedAt: number;
}

export class MealRecord extends Model {
  static table = "meals";
  @text("payload_json") declare payloadJson: string;
  @field("updated_at") declare updatedAt: number;
}

export class PlanRecord extends Model {
  static table = "plans";
  @text("payload_json") declare payloadJson: string;
  @field("updated_at") declare updatedAt: number;
}

export class SyncQueueRecord extends Model {
  static table = "sync_queue";
  @text("collection_name") declare collectionName: string;
  @text("op") declare op: string;
  @text("payload_json") declare payloadJson: string;
  @field("created_at") declare createdAt: number;
}
