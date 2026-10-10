import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, ErrorText, Field, LinkButton, Txt } from '@/components/ui';
import { emailDomainAllowed, errorText } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { useAuth } from '@/providers/AuthProvider';

export default function SignIn() {
  const c = useTheme();
  const { settings } = useAuth();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode() {
    setError(null);
    const clean = email.trim().toLowerCase();
    if (!emailDomainAllowed(clean, settings.allowed_email_domains)) {
      setError(`Use your UNSW student email (ending in @${settings.allowed_email_domains[0]}).`);
      return;
    }
    setBusy(true);
    const { error: e } = await supabase.auth.signInWithOtp({ email: clean, options: { shouldCreateUser: true } });
    setBusy(false);
    if (e) setError(errorText(e));
    else setSent(true);
  }

  async function verify() {
    setError(null);
    if (!/^\d{6,10}$/.test(code.trim())) {
      setError('Enter the code from the email.');
      return;
    }
    setBusy(true);
    const { error: e } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: 'email' });
    setBusy(false);
    if (e) setError('That code didn\'t work. Check it, or send a new one.');
    // On success the auth listener moves you to onboarding automatically.
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 22 }} keyboardShouldPersistTaps="handled">
          <Txt variant="title" accessibilityRole="header" style={{ marginTop: 12 }}>
            {sent ? 'Check your email' : 'Sign in with UNSW'}
          </Txt>
          <Txt variant="small" style={{ marginTop: 8, marginBottom: 22, fontSize: 16, lineHeight: 23 }}>
            {sent
              ? `We sent a code to ${email.trim().toLowerCase()}. It can take a minute to arrive.`
              : 'Rally is open to UNSW students. We\'ll email you a sign-in code, so there\'s no password to remember.'}
          </Txt>

          {!sent ? (
            <Field
              label="UNSW email"
              value={email}
              onChangeText={setEmail}
              placeholder={`z1234567@${settings.allowed_email_domains[0]}`}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
              returnKeyType="send"
              onSubmitEditing={sendCode}
            />
          ) : (
            <Field
              label="Sign-in code"
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              maxLength={10}
              returnKeyType="done"
              onSubmitEditing={verify}
            />
          )}

          <ErrorText>{error}</ErrorText>
          <Button label={sent ? 'Sign in' : 'Send code'} onPress={sent ? verify : sendCode} loading={busy} />

          {sent ? (
            <View style={{ alignItems: 'center', marginTop: 12 }}>
              <LinkButton
                label="Use a different email"
                onPress={() => {
                  setSent(false);
                  setCode('');
                  setError(null);
                }}
              />
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
