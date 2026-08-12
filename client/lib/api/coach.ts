import { apiRequest, ApiClientError } from './client';
import type { CoachChatRequest, CoachChatResponse, CoachProgramRequest, CoachProgramResponse } from './types';

function unwrapCoachReply(envelope: Record<string, unknown>): CoachChatResponse {
  const content = envelope.content as Record<string, unknown> | undefined;
  const reply =
    (content?.reply as string) ??
    (envelope.message as string) ??
    'Draft suggestion — edit before applying.';
  return {
    reply,
    aiObservation: true,
    provider: (envelope.provider as string) ?? undefined,
    editableDraft: content,
  };
}

function localCoachFallback(message: string): CoachChatResponse {
  const lower = message.toLowerCase();
  let reply =
    'Noted — I drafted a suggestion. Edit anything before applying (AI observation, not a final plan).';
  if (lower.includes('superset')) {
    reply =
      'Draft: pair Bench Press with Bent-over Row as a superset (3 rounds). Confirm or edit before saving.';
  } else if (lower.includes('program')) {
    reply =
      'Queued personalized program generation (background). You will confirm the draft before it becomes your plan.';
  }
  return { reply, aiObservation: true, provider: 'local-fallback' };
}

export async function sendCoachChat(body: CoachChatRequest): Promise<CoachChatResponse> {
  try {
    const res = await apiRequest<{ envelope: Record<string, unknown> }>(
      '/api/coach/chat',
      { method: 'POST', body: { prompt: body.message } },
    );
    return unwrapCoachReply(res.envelope);
  } catch (err) {
    if (err instanceof ApiClientError && err.status === 429) {
      const degraded = localCoachFallback(body.message);
      const bodyMessage =
        err.body && typeof err.body === 'object' && typeof err.body.message === 'string'
          ? err.body.message
          : err.message;
      return { ...degraded, degraded: true, message: bodyMessage, provider: 'quota-degraded' };
    }
    if (err instanceof ApiClientError && err.endpointUnavailable) {
      return localCoachFallback(body.message);
    }
    throw err;
  }
}

export async function requestProgramGeneration(
  body: CoachProgramRequest,
): Promise<CoachProgramResponse> {
  try {
    const res = await apiRequest<{ queued: { job?: { id?: string } } }>(
      '/api/coach/program',
      { method: 'POST', body: { prompt: body.prompt, idempotencyKey: body.goalType } },
    );
    return {
      jobId: res.queued?.job?.id ?? `job_${Date.now()}`,
      status: 'queued',
      message: 'Program generation queued — confirm draft before applying.',
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
      };
    }
    if (err instanceof ApiClientError && err.endpointUnavailable) {
      return {
        jobId: `local_${Date.now()}`,
        status: 'queued',
        message: 'Program generation queued locally until backend endpoint is available.',
      };
    }
    throw err;
  }
}
