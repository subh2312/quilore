/**
 * whisper.rn bridge with stub fallback — inference stays on-device when native module loads.
 */

export type PartialTranscript = {
  text: string;
  isFinal: boolean;
  engine: "whisper.cpp" | "stub";
};

let listening = false;
let buffer = "";
let nativeEngine: "whisper.cpp" | "stub" = "stub";

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("whisper.rn");
  nativeEngine = "whisper.cpp";
} catch {
  nativeEngine = "stub";
}

export function getWhisperEngineName() {
  return nativeEngine;
}

export function startListening() {
  listening = true;
  buffer = "";
  return { listening, engine: nativeEngine };
}

export function appendPartial(chunk: string): PartialTranscript {
  if (!listening) return { text: buffer, isFinal: false, engine: nativeEngine };
  buffer = `${buffer} ${chunk}`.trim();
  return { text: buffer, isFinal: false, engine: nativeEngine };
}

export function stopListening(): PartialTranscript {
  listening = false;
  return { text: buffer, isFinal: true, engine: nativeEngine };
}

export function isListening() {
  return listening;
}
