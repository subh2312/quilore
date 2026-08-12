/** Auth session from Spring Boot /api/auth/* */

export type UserRole = 'USER' | 'SUPPORT' | 'ADMIN';

export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
};

export type AuthSession = {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
};

/** Cursor-branch coach endpoints (stub contract until merged). */

export type CoachChatRequest = {
  message: string;
  conversationId?: string;
};

export type CoachChatResponse = {
  reply: string;
  aiObservation: boolean;
  conversationId?: string;
  editableDraft?: Record<string, unknown>;
  provider?: string;
};

export type CoachProgramRequest = {
  prompt: string;
  goalType?: string;
};

export type CoachProgramResponse = {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  message?: string;
};

/** Nutrition */

export type FoodQualityRequest = {
  items: { name: string; grams?: number }[];
  mealType?: string;
};

export type FoodQualityResponse = {
  feedback: string;
  flags: { code: string; message: string; severity: 'info' | 'warn' }[];
  aiObservation: boolean;
};

export type MealCalculateResponse = {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  disclaimer: string;
  items: {
    foodCode: string;
    foodName: string;
    grams: number;
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
  }[];
};

/** Workout */

export type WorkoutExercise = {
  name: string;
  sets: number;
  reps: number;
  weightKg?: number;
};

export type OcrMapRequest = {
  text: string;
  imageBase64?: string;
  source?: 'pdf' | 'photo' | 'paste';
};

export type OcrMapResponse = {
  exercises: WorkoutExercise[];
  rawText: string;
  aiObservation: boolean;
  provider?: string;
};

export type SessionSummaryRequest = {
  sessionId: string;
  startedAt: string;
  completedAt: string;
  exercises: {
    name: string;
    sets: { reps: number; weightKg?: number }[];
  }[];
};

export type PersonalRecord = {
  exerciseName: string;
  metric: 'weight' | 'volume' | 'reps';
  value: number;
  previousBest?: number;
};

export type SessionSummaryResponse = {
  sessionId: string;
  durationMinutes: number;
  totalVolumeKg: number;
  exerciseCount: number;
  personalRecords: PersonalRecord[];
  aiObservation: boolean;
};

/** Billing */

export type EntitlementState = {
  userId: string;
  plan: 'FREE' | 'PREMIUM' | string;
  features: Record<string, boolean>;
  quotas: Record<string, { limit: number; used: number; remaining: number }>;
  historicalDataAccess: boolean;
};

export type BillingPurchaseRequest = {
  productId: string;
  receipt: string;
  platform?: 'android' | 'ios' | 'mock';
};

/** Admin food aliases */

export type FoodAliasReview = {
  id: string;
  rawName: string;
  candidateCode: string;
  status: string;
  reviewer: string;
  notes: string;
  createdAt: string;
};

export type FoodAliasListResponse = {
  pending: FoodAliasReview[];
  activeMappings: Record<string, string>;
};

/** Sync */

export type SyncPushResponse = {
  applied: string[];
  conflicts: unknown[];
  serverTimestamp: number;
};

export type ApiError = {
  status: number;
  message: string;
  endpointUnavailable?: boolean;
};
