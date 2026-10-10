import { AtkinsonHyperlegible_400Regular, AtkinsonHyperlegible_700Bold } from '@expo-google-fonts/atkinson-hyperlegible';
import { BricolageGrotesque_600SemiBold, BricolageGrotesque_800ExtraBold } from '@expo-google-fonts/bricolage-grotesque';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { isAccountActive } from '@/lib/types';
import { fonts, useTheme } from '@/lib/theme';
import { AuthProvider, useAuth } from '@/providers/AuthProvider';

export default function RootLayout() {
  const [loaded, error] = useFonts({
    AtkinsonHyperlegible_400Regular,
    AtkinsonHyperlegible_700Bold,
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_800ExtraBold,
  });
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <Gate fontsReady={loaded || !!error} />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

/**
 * Decides which part of the app someone can reach:
 * signed out -> welcome and sign-in; signed in without a profile -> onboarding;
 * paused, banned or locked -> the paused screen; otherwise -> the app.
 */
function Gate({ fontsReady }: { fontsReady: boolean }) {
  const c = useTheme();
  const { session, profile, account, loading } = useAuth();

  if (!fontsReady || loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.court }}>
        <ActivityIndicator color="#FFFFFF" />
      </View>
    );
  }

  const signedIn = !!session;
  const onboarded = signedIn && !!profile && !!account;
  const active = onboarded && isAccountActive(account);

  return (
    <>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: c.paper },
          headerStyle: { backgroundColor: c.paper },
          headerTintColor: c.ink,
          headerTitleStyle: { fontFamily: fonts.displaySemi },
          headerShadowVisible: false,
            headerBackButtonDisplayMode: 'minimal',
        }}
      >
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected guard={signedIn && !onboarded}>
          <Stack.Screen name="(onboarding)" />
        </Stack.Protected>
        <Stack.Protected guard={onboarded && !active}>
          <Stack.Screen name="paused" />
        </Stack.Protected>
        <Stack.Protected guard={active}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="game/[id]" options={{ headerShown: true, title: '' }} />
          <Stack.Screen name="host" options={{ headerShown: true, title: 'Host a game', presentation: 'modal' }} />
          <Stack.Screen name="report" options={{ headerShown: true, title: 'Report', presentation: 'modal' }} />
          <Stack.Screen name="moderation" options={{ headerShown: true, title: 'Moderation queue' }} />
          <Stack.Screen name="guidelines" options={{ headerShown: true, title: 'Ground rules' }} />
        </Stack.Protected>
      </Stack>
    </>
  );
}
