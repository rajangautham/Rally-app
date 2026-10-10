import { Linking } from 'react-native';

import { OnboardingScreen } from '@/components/OnboardingScreen';
import { Banner, Button } from '@/components/ui';

export default function Underage() {
  return (
    <OnboardingScreen title="Rally is for adults only" lead="You need to be 18 or older to use Rally, so we can't set up an account for you.">
      <Banner tone="support" style={{ marginBottom: 16 }}>
        If you'd like someone to talk to, Kids Helpline is open 24 hours for young people aged 5 to 25.
      </Banner>
      <Button label="Call Kids Helpline 1800 55 1800" variant="support" onPress={() => void Linking.openURL('tel:1800551800')} />
    </OnboardingScreen>
  );
}
