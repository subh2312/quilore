import { Stack } from 'expo-router';

export default function AdminLayout() {
  return (
    <Stack>
      <Stack.Screen name="food-aliases" options={{ title: 'Food alias review' }} />
    </Stack>
  );
}
