import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { palette, radii, spacing, typography, touchTarget } from "@/constants/DesignTokens";
import { runOnDeviceOcr } from "@/lib/ocr/onDeviceOcr";

type Props = {
  onImported: (
    text: string,
    exercises: { name: string; sets: number; reps: number }[],
    notice?: string,
  ) => void;
};

export function PdfImportPanel({ onImported }: Props) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function pickPdf() {
    setBusy(true);
    setNote(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: "application/pdf", copyToCacheDirectory: true });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      const uri = asset?.uri ?? "file://workout.pdf";
      setNote(asset?.name ? `Imported ${asset.name} — OCR draft (editable).` : "PDF selected — OCR draft.");
      const ocr = await runOnDeviceOcr(uri);
      const exercises =
        ocr.mappedExercises ??
        ocr.text.split("\n").flatMap((line) => {
          const m = line.match(/^(.+?)\s+(\d+)\s*[x×]\s*(\d+)/i);
          return m ? [{ name: m[1].trim(), sets: Number(m[2]), reps: Number(m[3]) }] : [];
        });
      onImported(ocr.text, exercises, ocr.notice);
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.box}>
      <Text style={styles.label}>Import workout PDF / photo</Text>
      <Pressable style={styles.btn} onPress={pickPdf} disabled={busy}>
        {busy ? <ActivityIndicator color={palette.white} /> : <Text style={styles.btnText}>Pick PDF</Text>}
      </Pressable>
      {note ? <Text style={styles.note}>{note}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: spacing.sm },
  label: { fontWeight: "700", color: palette.gray800 },
  btn: {
    minHeight: touchTarget.minHeight,
    backgroundColor: palette.emerald,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: { color: palette.white, fontWeight: "700" },
  note: { fontSize: typography.fontSize.sm, color: palette.gray600 },
});
