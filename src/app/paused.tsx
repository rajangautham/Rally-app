import { Linking, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Actions, Banner, Button, Txt } from '@/components/ui';
import { useTheme } from '@/lib/theme';
import { useAuth } from '@/providers/AuthProvider';

export default function Paused() {
  const c = useTheme();
  const { account, refresh, signOut } = useAuth();
  const until = account?.suspended_until
    ? new Date(account.suspended_until).toLocaleString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' })
    : null;

  const copy =
    account?.status === 'banned'
      ? { title: 'Your account has been banned', body: 'Your account broke the ground rules, so it has been removed from Rally.' }
      : account?.status === 'locked'
        ? { title: 'Your account is locked', body: 'Someone reported that you might be under 18. Your account stays locked until your age is verified.' }
        : { title: 'Your account is paused', body: `A moderator upheld a second report about your account. You can't join games or chat until ${until ?? 'the pause ends'}. One more upheld report means a permanent ban.` };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }}>
      <ScrollView contentContainerStyle={{ padding: 22 }}>
        <Txt variant="title" accessibilityRole="header" style={{ marginTop: 20 }}>{copy.title}</Txt>
        <Txt style={{ marginTop: 10, marginBottom: 20 }}>{copy.body}</Txt>
        <Banner tone="support">
          <Txt color={c.support}>
            If things feel hard right now, Lifeline is there 24 hours on{' '}
            <Txt variant="bold" color={c.support} onPress={() => void Linking.openURL('tel:131114')} style={{ textDecorationLine: 'underline' }}>
              13 11 14
            </Txt>
            .
          </Txt>
        </Banner>
        <Actions>
          {account?.status === 'suspended' ? <Button label="Check again" onPress={() => void refresh()} /> : null}
          <Button label="Sign out" variant="ghost" onPress={() => void signOut()} />
        </Actions>
      </ScrollView>
    </SafeAreaView>
  );
}
