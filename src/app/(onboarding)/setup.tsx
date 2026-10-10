import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { OnboardingScreen } from '@/components/OnboardingScreen';
import { Button, Chip, ErrorText, Field, Txt } from '@/components/ui';
import { LEVELS, SPORTS, type LevelKey, type SportKey } from '@/lib/constants';
import { errorText } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { useOnboarding } from '@/providers/OnboardingProvider';

export default function Setup() {
  const { refresh } = useAuth();
  const { dob, rulesAccepted } = useOnboarding();
  const [name, setName] = useState('');
  const [suburb, setSuburb] = useState('Kensington');
  const [sports, setSports] = useState<SportKey[]>([]);
  const [level, setLevel] = useState<LevelKey>('fun');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If the app restarted mid-way, the earlier answers are gone, so start again.
  useEffect(() => {
    if (!dob || !rulesAccepted) router.replace('/age');
  }, [dob, rulesAccepted]);

  function toggle(s: SportKey) {
    setSports((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));
  }

  async function finish() {
    setError(null);
    if (!name.trim()) return setError('Add your first name.');
    if (!suburb.trim()) return setError('Add your suburb.');
    if (!sports.length) return setError('Pick at least one sport.');
    setBusy(true);
    const { error: e } = await supabase.rpc('complete_onboarding', {
      p_first_name: name.trim(),
      p_suburb: suburb.trim(),
      p_sports: sports,
      p_level: level,
      p_dob: dob,
      p_accept_rules: rulesAccepted,
    });
    if (e) {
      setBusy(false);
      setError(errorText(e));
      return;
    }
    await refresh(); // the gate now sends you into the app
  }

  return (
    <OnboardingScreen step="Step 4 of 4" title="Set up your profile" lead="Other players see your first name, suburb and sports. Nothing else.">
      <Field label="First name" value={name} onChangeText={setName} maxLength={30} autoComplete="given-name" textContentType="givenName" />
      <Field label="Suburb" value={suburb} onChangeText={setSuburb} maxLength={40} hint="We show your suburb, never your address." />
      <Txt variant="label" style={{ marginBottom: 8 }}>What do you play?</Txt>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
        {SPORTS.map((s) => (
          <Chip key={s.key} label={`${s.emoji} ${s.name}`} selected={sports.includes(s.key)} onPress={() => toggle(s.key)} />
        ))}
      </View>
      <Txt variant="label" style={{ marginBottom: 8 }}>How would you describe yourself?</Txt>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
        {(Object.keys(LEVELS) as LevelKey[]).map((k) => (
          <Chip key={k} label={LEVELS[k]} selected={level === k} onPress={() => setLevel(k)} />
        ))}
      </View>
      <ErrorText>{error}</ErrorText>
      <Button label="Start playing" variant="ball" onPress={finish} loading={busy} />
    </OnboardingScreen>
  );
}
