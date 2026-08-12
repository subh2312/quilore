/**
 * On-device OCR first-pass contract (Vision/ML Kit).
 * Native binding is platform-specific; editable text handoff goes to FastAPI mapper.
 */

export type OnDeviceOcrResult = {
  text: string;
  confidence: number;
  engine: 'vision' | 'mlkit' | 'stub';
  lowConfidenceLines: string[];
};

export async function runOnDeviceOcr(_imageUri: string): Promise<OnDeviceOcrResult> {
  return {
    text: 'Squat 3x5 @ 100kg\nBench Press 3x8 @ 60kg',
    confidence: 0.7,
    engine: 'stub',
    lowConfidenceLines: [],
  };
}
