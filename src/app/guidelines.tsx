import { ScrollView } from 'react-native';

import { RulesList } from '@/components/RulesList';
import { Txt } from '@/components/ui';
import { useTheme } from '@/lib/theme';

export default function Guidelines() {
  const c = useTheme();
  return (
    <ScrollView style={{ backgroundColor: c.paper }} contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 32 }}>
      <RulesList />
      <Txt variant="small" style={{ marginTop: 14 }}>
        Serious harm, like threats or sexual content, skips straight to a ban. Anyone who might be under 18 is locked until their age is verified.
      </Txt>
    </ScrollView>
  );
}
