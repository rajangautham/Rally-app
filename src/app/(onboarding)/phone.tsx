import { router } from 'expo-router';
import { useState } from 'react';

import { OnboardingScreen } from '@/components/OnboardingScreen';
import { Button, ErrorText, Field, LinkButton } from '@/components/ui';
import { errorText, toAuMobileE164 } from '@/lib/format';
import { supabase } from '@/lib/supabase';

export default function Phone() {
  const [number, setNumber] = useState('');
  const [e164, setE164] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode() {
    setError(null);
    const phone = toAuMobileE164(number);
    if (!phone) {
      setError('Enter an Australian mobile number, like 0412 345 678.');
      return;
    }
    setBusy(true);
    const { error: e } = await supabase.auth.updateUser({ phone });
    setBusy(false);
    if (e) setError(errorText(e));
    else setE164(phone);
  }

  async function verify() {
    if (!e164) return;
    setError(null);
    setBusy(true);
    const { error: e } = await supabase.auth.verifyOtp({ phone: e164, token: code.trim(), type: 'phone_change' });
    setBusy(false);
    if (e) setError('That code didn\'t work. Check it, or send a new one.');
    else router.push('/setup');
  }

  return (
    <OnboardingScreen
      step="Step 3 of 4"
      title={e164 ? 'Enter the code' : 'Add your mobile'}
      lead={e164 ? `We texted a code to ${number}.` : 'A verified number makes fake and repeat accounts much harder. Other players never see it.'}
    >
      {!e164 ? (
        <Field label="Mobile number" value={number} onChangeText={setNumber} placeholder="0412 345 678" keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" />
      ) : (
        <Field label="Code" value={code} onChangeText={setCode} keyboardType="number-pad" autoComplete="one-time-code" textContentType="oneTimeCode" maxLength={10} />
      )}
      <ErrorText>{error}</ErrorText>
      <Button label={e164 ? 'Verify number' : 'Text me a code'} onPress={e164 ? verify : sendCode} loading={busy} />
      {e164 ? <LinkButton label="Use a different number" onPress={() => { setE164(null); setCode(''); }} /> : null}
    </OnboardingScreen>
  );
}
