import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LinkButton, Txt } from '@/components/ui';
import { useTheme } from '@/lib/theme';
import { useAuth } from '@/providers/AuthProvider';

export function OnboardingScreen({ step, title, lead, children }: { step?: string; title: string; lead?: string; children: ReactNode }) {
  const c = useTheme();
  const { signOut } = useAuth();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 22, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          {step ? <Txt variant="label" color={c.muted} style={{ marginTop: 8 }}>{step}</Txt> : null}
          <Txt variant="title" accessibilityRole="header" style={{ marginTop: 6 }}>{title}</Txt>
          {lead ? <Txt variant="small" style={{ marginTop: 8, marginBottom: 20, fontSize: 16, lineHeight: 23 }}>{lead}</Txt> : <View style={{ height: 16 }} />}
          {children}
          <View style={{ alignItems: 'center', marginTop: 24 }}>
            <LinkButton label="Sign out" onPress={() => void signOut()} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
