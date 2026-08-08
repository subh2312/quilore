import { StyleSheet, Text, View } from 'react-native';

export default function MuscleMapScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Muscle Map</Text>
      <Text style={styles.subtitle}>Interactive body diagram for injury triage and targeting</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center' },
});
