import { View } from 'react-native';

import { Txt } from '@/components/ui';
import { RULES } from '@/lib/constants';
import { useTheme } from '@/lib/theme';

export function RulesList() {
  const c = useTheme();
  return (
    <View>
      {RULES.map((r) => (
        <View key={r.title} style={{ flexDirection: 'row', gap: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.line }}>
          <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: c.surface2, alignItems: 'center', justifyContent: 'center' }}>
            <Txt style={{ fontSize: 20 }}>{r.icon}</Txt>
          </View>
          <View style={{ flex: 1 }}>
            <Txt variant="bold">{r.title}</Txt>
            <Txt variant="small" style={{ fontSize: 15, marginTop: 2 }}>{r.body}</Txt>
          </View>
        </View>
      ))}
    </View>
  );
}
