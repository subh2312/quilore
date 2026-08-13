import { apiRequest, ApiClientError } from './client';
import type {
  CoachChatRequest,
  CoachChatResponse,
  CoachProgramExercise,
  CoachProgramRequest,
  CoachProgramResponse,
} from './types';
import { looksLikeMealLog, parseMealLogItems } from '../nutrition/parseMealLog';

function unwrapCoachReply(envelope: Record<string, unknown>, originalMessage: string): CoachChatResponse {
  const content = (envelope.content as Record<string, unknown> | undefined) ?? undefined;
  const contentReply =
    (typeof content?.reply === 'string' && content.reply.trim()) ||
    (typeof content?.text === 'string' && content.text.trim()) ||
    '';
  const envelopeMessage = typeof envelope.message === 'string' ? envelope.message.trim() : '';
  const degraded = envelope.degraded === true;
  const unavailable =
    degraded &&
    (!contentReply ||
      /unavailable|no live provider|heuristic coach draft/i.test(contentReply) ||
      /unavailable/i.test(envelopeMessage));

  // Prefer a useful local draft when the gateway only returned "unavailable" status with no reply.
  if (unavailable || !contentReply) {
    if (!contentReply && envelopeMessage && !/unavailable/i.test(envelopeMessage)) {
      return {
        reply: envelopeMessage,
        aiObservation: true,
        provider: (envelope.provider as string) ?? undefined,
        editableDraft: content,
        degraded,
      };
    }
    const local = localCoachFallback(originalMessage);
    return {
      ...local,
      degraded: true,
      message: envelopeMessage || local.message,
      provider: (envelope.provider as string) ?? local.provider,
      editableDraft: content ?? local.editableDraft,
    };
  }

  return {
    reply: contentReply,
    aiObservation: true,
    provider: (envelope.provider as string) ?? undefined,
    editableDraft: content,
    degraded: degraded || undefined,
    message: envelopeMessage || undefined,
  };
}

/** Always-available coaching draft so chat never goes silent offline / when AI is down. */
export function localCoachFallback(message: string): CoachChatResponse {
  const trimmed = message.trim();
  const lower = trimmed.toLowerCase();

  if (looksLikeMealLog(trimmed)) {
    const items = parseMealLogItems(trimmed);
    if (items.length > 0) {
      const names = items.map((i) => i.label).join(', ');
      return {
        reply: `Got it — logging ${names}. Confirm the list below (editable) before macros save. Portion tips: use katori/roti units if that matches how you plated it.`,
        aiObservation: true,
        provider: 'local-fallback',
        editableDraft: { dishes: items.map((i) => i.label) },
      };
    }
    return {
      reply:
        'I can log that meal — name each dish in the confirmation card (or Nutrition → Manual composer) so macros stay editable before save.',
      aiObservation: true,
      provider: 'local-fallback',
    };
  }

  if (/\bsuperset\b/.test(lower)) {
    return {
      reply:
        'Draft: pair Bench Press with Bent-over Row as a superset (3 rounds). Confirm or edit before saving to your workout.',
      aiObservation: true,
      provider: 'local-fallback',
    };
  }

  if (/\b(program|mesocycle|block|deload)\b/.test(lower)) {
    return {
      reply:
        'Draft plan note: keep intensity moderate this week, then progress load next week. Confirm before it becomes your active program.',
      aiObservation: true,
      provider: 'local-fallback',
    };
  }

  if (/\b(squat|bench|deadlift|curl|press|row|set|reps?)\b/.test(lower)) {
    return {
      reply: `Draft workout note for “${trimmed.slice(0, 80)}”: log sets × reps on the Workout tab (voice or manual) so volume stays editable.`,
      aiObservation: true,
      provider: 'local-fallback',
    };
  }

  if (/\b(fat loss|cut|bulk|recomp|calorie|macro|protein)\b/.test(lower)) {
    return {
      reply:
        'Coaching estimate: set your primary goal under Profile — macro targets recalculate from that goal and stay editable in Nutrition.',
      aiObservation: true,
      provider: 'local-fallback',
    };
  }

  return {
    reply: `Heard: “${trimmed.slice(0, 120)}”. Here’s a draft coaching note — edit anything before applying (not medical advice).`,
    aiObservation: true,
    provider: 'local-fallback',
  };
}

export async function sendCoachChat(body: CoachChatRequest): Promise<CoachChatResponse> {
  try {
    const res = await apiRequest<{ envelope?: Record<string, unknown>; message?: string }>(
      '/api/coach/chat',
      { method: 'POST', body: { prompt: body.message, message: body.message } },
    );
    if (!res.envelope) {
      const local = localCoachFallback(body.message);
      return {
        ...local,
        degraded: true,
        message: typeof res.message === 'string' ? res.message : 'No coach envelope — using local draft.',
      };
    }
    return unwrapCoachReply(res.envelope, body.message);
  } catch (err) {
    // Never leave chat silent: auth/quota/network all degrade to a local reply.
    if (err instanceof ApiClientError) {
      const degraded = localCoachFallback(body.message);
      const bodyMessage =
        err.body && typeof err.body === 'object' && typeof err.body.message === 'string'
          ? err.body.message
          : err.message;
      return {
        ...degraded,
        degraded: true,
        message: bodyMessage,
        provider: err.status === 429 ? 'quota-degraded' : 'local-fallback',
      };
    }
    return {
      ...localCoachFallback(body.message),
      degraded: true,
      message: err instanceof Error ? err.message : 'Coach chat failed',
    };
  }
}

export async function requestProgramGeneration(
  body: CoachProgramRequest,
): Promise<CoachProgramResponse> {
  const { generateProgramFromPreferences } = await import('../workout/generateFromPreferences');
  const prefs = {
    primaryGoal: body.preferences?.primaryGoal ?? body.goalType ?? 'recomp',
    trainingExperience: body.preferences?.trainingExperience ?? 'beginner',
    equipmentAccess: body.preferences?.equipmentAccess,
    daysPerWeek: body.preferences?.daysPerWeek ?? 4,
    secondaryPrefs: body.preferences?.secondaryPrefs,
    injuriesInfo: body.preferences?.injuriesInfo,
  };
  const local = generateProgramFromPreferences(prefs);

  try {
    const res = await apiRequest<{
      queued?: { job?: { id?: string }; id?: string };
      draft?: { content?: { reply?: string }; message?: string };
      message?: string;
      program?: {
        title?: string;
        sessions?: Array<{ dayLabel: string; focus: string; exercises: CoachProgramExercise[] }>;
      };
    }>('/api/coach/program', {
      method: 'POST',
      body: {
        prompt: body.prompt,
        idempotencyKey: body.goalType ?? prefs.primaryGoal,
        preferences: prefs,
      },
    });

    const apiSessions = res.program?.sessions;
    const exercises =
      apiSessions?.[0]?.exercises ??
      local.activeSession.exercises.map((e) => ({
        name: e.name,
        sets: e.sets,
        reps: e.reps,
        notes: e.notes,
      }));

    return {
      jobId: res.queued?.job?.id ?? res.queued?.id ?? `job_${Date.now()}`,
      status: 'ready_draft',
      message:
        res.message ??
        'Preference-based routine draft ready — edit before training. PDF/photo/voice remain available to update it.',
      title: res.program?.title ?? local.title,
      summary: local.summary,
      exercises,
      sessions: apiSessions ?? local.sessions,
      degraded: false,
    };
  } catch (err) {
    if (err instanceof ApiClientError && err.status === 429) {
      return {
        jobId: `quota_${Date.now()}`,
        status: 'degraded',
        message:
          err.body && typeof err.body === 'object' && typeof err.body.message === 'string'
            ? err.body.message
            : err.message,
        degraded: true,
        title: local.title,
        summary: local.summary,
        exercises: local.activeSession.exercises,
        sessions: local.sessions,
      };
    }
    // Offline / auth / unavailable — still return a usable preference draft.
    return {
      jobId: `local_${Date.now()}`,
      status: 'local_draft',
      message: 'Generated from your profile preferences (offline draft — editable).',
      degraded: true,
      title: local.title,
      summary: local.summary,
      exercises: local.activeSession.exercises,
      sessions: local.sessions,
    };
  }
}
