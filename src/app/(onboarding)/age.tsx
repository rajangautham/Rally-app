import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { TextInput, View } from 'react-native';

import { OnboardingScreen } from '@/components/OnboardingScreen';
import { Button, ErrorText, Field, Txt } from '@/components/ui';
import { ageOn, errorText, parseDob, toIsoDate } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { useOnboarding } from '@/providers/OnboardingProvider';

export default function Age() {
  const { settings } = useAuth();
  const { setDob } = useOnboarding();
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const monthRef = useRef<TextInput>(null);
  const yearRef = useRef<TextInput>(null);

  async function next() {
    setError(null);
    const dob = parseDob(day, month, year);
    if (!dob) {
      setError('Enter a real date, like 07 03 2002.');
      return;
    }
    setBusy(true);
    // The server records under-age attempts so a different date can't be tried later.
    const { data, error: e } = await supabase.rpc('check_age', { p_dob: toIsoDate(dob) });
    setBusy(false);
    if (e) {
      setError(errorText(e));
      return;
    }
    if (data !== true || ageOn(dob) < settings.min_age) {
      router.replace('/underage');
      return;
    }
    setDob(toIsoDate(dob));
    router.push('/rules');
  }

  return (
    <OnboardingScreen step="Step 1 of 4" title="How old are you?" lead={`Rally is for adults. You need to be ${settings.min_age} or older to join.`}>
      <Txt variant="label" style={{ marginBottom: 6 }}>Date of birth</Txt>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Field label="Day" value={day} onChangeText={(t) => { setDay(t); if (t.length === 2) monthRef.current?.focus(); }} placeholder="DD" keyboardType="number-pad" maxLength={2} style={{ flex: 1 }} />
        <Field ref={monthRef} label="Month" value={month} onChangeText={(t) => { setMonth(t); if (t.length === 2) yearRef.current?.focus(); }} placeholder="MM" keyboardType="number-pad" maxLength={2} style={{ flex: 1 }} />
        <Field ref={yearRef} label="Year" value={year} onChangeText={setYear} placeholder="YYYY" keyboardType="number-pad" maxLength={4} style={{ flex: 1.4 }} />
      </View>
      <ErrorText>{error}</ErrorText>
      <Txt variant="small" style={{ marginBottom: 18 }}>
        Only you can see your date of birth. Entering a false one breaks the ground rules and gets accounts removed.
      </Txt>
      <Button label="Continue" onPress={next} loading={busy} />
    </OnboardingScreen>
  );
}
