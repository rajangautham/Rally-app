import { Stack } from 'expo-router';

import { OnboardingProvider } from '@/providers/OnboardingProvider';

export const unstable_settings = { initialRouteName: 'age' };

export default function OnboardingLayout() {
  return (
    <OnboardingProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </OnboardingProvider>
  );
}
