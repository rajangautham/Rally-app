import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { OnboardingScreen } from '@/components/OnboardingScreen';
import { Button, ErrorText, Txt } from '@/components/ui';
import { RulesList } from '@/components/RulesList';
import { useTheme } from '@/lib/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useOnboarding } from '@/providers/OnboardingProvider';

export default function Rules() {
  const c = useTheme();
  const { settings, session } = useAuth();
  const { rulesAccepted, setRulesAccepted } = useOnboarding();
  const [error, setError] = useState<string | null>(null);

  function next() {
    if (!rulesAccepted) {
      setError('Tick the box to agree before you continue.');
      return;
    }
    const needsPhone = settings.require_phone && !session?.user.phone_confirmed_at;
    router.push(needsPhone ? '/phone' : '/setup');
  }

  return (
    <OnboardingScreen step="Step 2 of 4" title="Our ground rules" lead="Rally only works if people feel safe turning up. Everyone agrees to these.">
      <RulesList />
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: rulesAccepted }}
        onPress={() => {
          setRulesAccepted(!rulesAccepted);
          setError(null);
        }}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 18 }}
      >
        <View style={{ width: 26, height: 26, borderRadius: 6, borderWidth: 2, borderColor: c.accent, backgroundColor: rulesAccepted ? c.accent : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
          {rulesAccepted ? <Ionicons name="checkmark" size={18} color={c.paper} /> : null}
        </View>
        <Txt variant="bold">I agree to the ground rules</Txt>
      </Pressable>
      <ErrorText>{error}</ErrorText>
      <Button label="Continue" onPress={next} />
    </OnboardingScreen>
  );
}
