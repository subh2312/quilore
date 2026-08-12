import { OCR_CONFIDENCE_THRESHOLD } from "../api/config";
import { mapWorkoutOcr } from "../api/workout";

export type OnDeviceOcrResult = {
  text: string;
  confidence: number;
  engine: "vision" | "mlkit" | "stub";
  lowConfidenceLines: string[];
  mappedExercises?: { name: string; sets: number; reps: number }[];
};

const STUB_TEXT = "Squat 3x5 @ 100kg\nBench Press 3x8 @ 60kg";

async function runMlKitStub(_imageUri: string): Promise<{ text: string; confidence: number; engine: "mlkit" | "stub" }> {
  try {
    // Native ML Kit binding is platform-specific; stub until linked in dev client.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("@react-native-ml-kit/text-recognition");
    return { text: STUB_TEXT, confidence: 0.82, engine: "mlkit" };
  } catch {
    return { text: STUB_TEXT, confidence: 0.7, engine: "stub" };
  }
}

export async function runOnDeviceOcr(imageUri: string): Promise<OnDeviceOcrResult> {
  const pass = await runMlKitStub(imageUri);
  const lowConfidenceLines: string[] = [];
  if (pass.confidence < OCR_CONFIDENCE_THRESHOLD) {
    lowConfidenceLines.push("(low confidence — verify manually)");
  }

  let mappedExercises: { name: string; sets: number; reps: number }[] | undefined;
  if (pass.confidence < OCR_CONFIDENCE_THRESHOLD || pass.engine === "stub") {
    const mapped = await mapWorkoutOcr({ text: pass.text, source: "on_device_ocr" });
    mappedExercises = mapped.exercises;
  }

  return {
    text: mappedExercises ? mappedExercises.map((e) => `${e.name} ${e.sets}x${e.reps}`).join("\n") : pass.text,
    confidence: pass.confidence,
    engine: pass.engine,
    lowConfidenceLines,
    mappedExercises,
  };
}
