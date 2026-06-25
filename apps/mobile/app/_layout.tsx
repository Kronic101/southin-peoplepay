import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: '#071426',
          },
          headerTintColor: '#ffffff',
          headerTitleStyle: {
            fontWeight: '900',
          },
          contentStyle: {
            backgroundColor: '#eef4f8',
          },
        }}
      />
    </>
  );
}