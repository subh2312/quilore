/**
 * Whisper.cpp on-device transcription contract.
 * Inference stays on-device; cloud structuring goes through FastAPI.
 */

export type PartialTranscript = {
  text: string;
  isFinal: boolean;
  engine: 'whisper.cpp' | 'stub';
};

let listening = false;
let buffer = '';

export function startListening() {
  listening = true;
  buffer = '';
  return { listening };
}

export function appendPartial(chunk: string): PartialTranscript {
  if (!listening) return { text: buffer, isFinal: false, engine: 'stub' };
  buffer = `${buffer} ${chunk}`.trim();
  return { text: buffer, isFinal: false, engine: 'stub' };
}

export function stopListening(): PartialTranscript {
  listening = false;
  return { text: buffer, isFinal: true, engine: 'stub' };
}

export function isListening() {
  return listening;
}
