import { apiRequest, ApiClientError } from './client';
import { getStoredUserId } from './authStorage';
import type {
  OcrMapRequest,
  OcrMapResponse,
  PersonalRecord,
  SessionSummaryRequest,
  SessionSummaryResponse,
  WorkoutExercise,
} from './types';

function parseExercisesFromText(text: string): WorkoutExercise[] {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const exercises: WorkoutExercise[] = [];
  for (const line of lines) {
    const match = line.match(/^(.+?)\s+(\d+)\s*[x×]\s*(\d+)/i);
    if (match) {
      exercises.push({ name: match[1].trim(), sets: Number(match[2]), reps: Number(match[3]) });
    }
  }
  return exercises;
}

function mapSessionSummary(raw: Record<string, unknown>, sessionId: string): SessionSummaryResponse {
  const prRaw = (raw.personalRecords as Record<string, unknown>[] | undefined) ?? [];
  const personalRecords: PersonalRecord[] = prRaw.map((pr) => ({
    exerciseName: String(pr.exercise ?? pr.exerciseName ?? 'exercise'),
    metric: 'weight',
    value: Number(pr.newMax ?? pr.newVolume ?? 0),
    previousBest: pr.priorMax != null ? Number(pr.priorMax) : undefined,
  }));
  return {
    sessionId,
    durationMinutes: Number(raw.durationMinutes ?? 0),
    totalVolumeKg: Number(raw.totalVolume ?? raw.totalVolumeKg ?? 0),
    exerciseCount: Number(raw.exerciseCount ?? 0),
    personalRecords,
    aiObservation: Boolean(raw.hasPersonalRecords ?? personalRecords.length > 0),
  };
}

function localSessionSummary(body: SessionSummaryRequest): SessionSummaryResponse {
  const durationMinutes = Math.max(
    1,
    Math.round(
      (new Date(body.completedAt).getTime() - new Date(body.startedAt).getTime()) / 60000,
    ),
  );
  let totalVolumeKg = 0;
  for (const ex of body.exercises) {
    for (const set of ex.sets) {
      totalVolumeKg += set.reps * (set.weightKg ?? 0);
    }
  }
  return {
    sessionId: body.sessionId,
    durationMinutes,
    totalVolumeKg,
    exerciseCount: body.exercises.length,
    personalRecords: [],
    aiObservation: false,
  };
}

export async function mapWorkoutOcr(body: OcrMapRequest): Promise<OcrMapResponse> {
  try {
    const res = await apiRequest<Record<string, unknown>>(`/api/workout/ocr-map`, {
      method: 'POST',
      body: { text: body.text, source: body.source ?? 'on_device_ocr' },
    });
    const exercises = (res.exercises as WorkoutExercise[] | undefined) ?? parseExercisesFromText(body.text);
    return {
      exercises,
      rawText: (res.rawText as string) ?? body.text,
      aiObservation: Boolean(res.editable ?? exercises.length > 0),
      provider: (res.provider as string) ?? undefined,
    };
  } catch (err) {
    if (err instanceof ApiClientError && err.status === 429) {
      const exercises = parseExercisesFromText(body.text);
      return {
        exercises,
        rawText: body.text,
        aiObservation: exercises.length > 0,
        provider: 'quota-degraded',
        degraded: true,
        message:
          err.body && typeof err.body === 'object' && typeof err.body.message === 'string'
            ? err.body.message
            : err.message,
      };
    }
    if (err instanceof ApiClientError && err.endpointUnavailable) {
      const exercises = parseExercisesFromText(body.text);
      return { exercises, rawText: body.text, aiObservation: exercises.length > 0, provider: 'local-regex' };
    }
    throw err;
  }
}

export async function fetchSessionSummary(body: SessionSummaryRequest): Promise<SessionSummaryResponse> {
  const userId = await getStoredUserId();
  try {
    if (!userId) {
      throw new ApiClientError({ status: 401, message: 'offline', endpointUnavailable: true });
    }
    const exercises = body.exercises.map((ex) => ({
      name: ex.name,
      sets: ex.sets.length,
      reps: ex.sets[0]?.reps ?? 0,
      load: ex.sets.reduce((max, s) => Math.max(max, s.weightKg ?? 0), 0),
    }));
    const res = await apiRequest<Record<string, unknown>>(`/api/workout/${userId}/session-summary`, {
      method: 'POST',
      body: {
        sessionId: body.sessionId,
        startedAt: body.startedAt,
        completedAt: body.completedAt,
        exercises,
        durationMinutes: Math.max(
          1,
          Math.round(
            (new Date(body.completedAt).getTime() - new Date(body.startedAt).getTime()) / 60000,
          ),
        ),
      },
    });
    return mapSessionSummary(res, body.sessionId);
  } catch (err) {
    if (err instanceof ApiClientError && err.endpointUnavailable) {
      return localSessionSummary(body);
    }
    throw err;
  }
}
