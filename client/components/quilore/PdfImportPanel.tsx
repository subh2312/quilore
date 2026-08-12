import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { palette, radii, spacing, typography, touchTarget } from '@/constants/DesignTokens';
import { mapWorkoutOcr } from '@/lib/api/workout';
import { runOnDeviceOcr } from '@/lib/ocr/onDeviceOcr';

export type PdfImportStage = 'idle' | 'picking' | 'ocr' | 'mapping' | 'confirm' | 'error';

type Props = {
  onMapped: (text: string, exercises: { name: string; sets: number; reps: number }[]) => void;
};

export function PdfImportPanel({ onMapped }: Props) {
  const [stage, setStage] = useState<PdfImportStage>('idle');
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pickAndImport() {
    setError(null);
    setStage('picking');
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) {
        setStage('idle');
        return;
      }
      const asset = result.assets[0];
      setFileName(asset.name);
      setStage('ocr');

      const ocr = await runOnDeviceOcr(asset.uri);
      setStage('mapping');
      const mapped = await mapWorkoutOcr({
        text: ocr.text,
        source: asset.mimeType?.includes('pdf') ? 'pdf' : 'photo',
      });
      setStage('confirm');
      onMapped(mapped.rawText || ocr.text, mapped.exercises);
      setStage('idle');
    } catch (err) {
      setStage('error');
      setError(err instanceof Error ? err.message : 'Import failed');
    }
  }

  const busy = stage === 'picking' || stage === 'ocr' || stage === 'mapping';

  return (
    <View style={styles.wrap}>
      <Pressable
        style={[styles.button, busy && styles.buttonDisabled]}
        onPress={pickAndImport}
        disabled={busy}>
        {busy ? (
          <ActivityIndicator color={palette.emeraldDark} />
        ) : (
          <Text style={styles.buttonText}>
            {fileName ? `Re-import (${fileName})` : 'Import PDF / photo plan'}
          </Text>
        )}
      </Pressable>
      {stage !== 'idle' && stage !== 'error' ? (
        <Text style={styles.stage}>Stage: {stage}…</Text>
      ) : null}
      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retry} onPress={pickAndImport}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : null}
      <Text style={styles.hint}>OCR drafts are editable — AI output is never final.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  button: {
    minHeight: touchTarget.minHeight,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.emerald,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: palette.emeraldDark, fontWeight: '700' },
  stage: { fontSize: typography.fontSize.xs, color: palette.gray500 },
  hint: { fontSize: typography.fontSize.xs, color: palette.gray500 },
  errorBox: {
    backgroundColor: '#FEE2E2',
    padding: spacing.sm,
    borderRadius: radii.md,
    gap: spacing.xs,
  },
  errorText: { color: palette.red, fontWeight: '600' },
  retry: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: palette.white,
    borderRadius: radii.sm,
  },
  retryText: { color: palette.red, fontWeight: '700' },
});
