import { StyleSheet, Text, View } from 'react-native';

export default function NutritionScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Nutrition</Text>
      <Text style={styles.subtitle}>Meal logging, macro tracking, and diet feedback</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center' },
});
