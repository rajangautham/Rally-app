import { Linking, ScrollView, View } from 'react-native';

import { CourtHeader } from '@/components/court';
import { Banner, Button, Txt } from '@/components/ui';
import { CRISIS_LINES } from '@/lib/constants';
import { useTheme } from '@/lib/theme';

export default function Support() {
  const c = useTheme();
  const call = (tel: string) => void Linking.openURL(`tel:${tel}`);
  return (
    <View style={{ flex: 1, backgroundColor: c.paper }}>
      <CourtHeader title="Support" showSupport={false} />
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <Banner tone="danger" style={{ margin: 18, marginBottom: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <Txt variant="bold" color={c.danger} style={{ flex: 1 }}>In immediate danger? Call 000.</Txt>
            <Button label="Call 000" variant="danger" small onPress={() => call('000')} />
          </View>
        </Banner>
        <Txt style={{ padding: 18 }}>
          Rally helps you find company. It isn't a crisis service. If you need to talk to someone now, these services are available across Australia.
        </Txt>
        {CRISIS_LINES.map((l) => (
          <View key={l.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.line }}>
            <View style={{ flex: 1 }}>
              <Txt variant="bold">{l.name}</Txt>
              <Txt variant="small">{l.description}</Txt>
              {'sms' in l ? (
                <Txt variant="small" color={c.support} onPress={() => void Linking.openURL(`sms:${l.sms}`)} style={{ textDecorationLine: 'underline' }}>
                  Or text {l.smsDisplay}
                </Txt>
              ) : null}
            </View>
            <Button label={l.display} variant="support" small onPress={() => call(l.tel)} />
          </View>
        ))}
        <Txt variant="heading" style={{ marginHorizontal: 18, marginTop: 26 }}>Talking to a professional</Txt>
        <Txt style={{ paddingHorizontal: 18, marginTop: 6 }}>
          A GP can write you a mental health treatment plan, which gives you Medicare-subsidised sessions with a psychologist. You don't need to be in crisis to ask.
        </Txt>
        <View style={{ margin: 18, padding: 14, borderWidth: 1.5, borderStyle: 'dashed', borderColor: c.line, borderRadius: 14 }}>
          <Txt variant="bold">Coming in a later version</Txt>
          <Txt variant="small" style={{ marginTop: 4, fontSize: 15 }}>
            Find psychologists and counsellors near you, with bulk-billing and telehealth filters, from official health directories.
          </Txt>
        </View>
      </ScrollView>
    </View>
  );
}
