import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CourtLines } from '@/components/court';
import { Button } from '@/components/ui';
import { fonts, useTheme } from '@/lib/theme';

export default function Welcome() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, { backgroundColor: c.court, paddingBottom: insets.bottom + 28 }]}>
      <CourtLines opacity={0.4} portrait />
      <Text accessibilityRole="header" style={styles.word}>Rally</Text>
      <Text style={styles.lede}>Find people to play with.</Text>
      <Text style={styles.body}>Pickup games and running groups near you, for anyone who could use a bit more company in their week.</Text>
      <Text style={styles.small}>For UNSW students 18 and over.</Text>
      <Button label="Get started" variant="ball" onPress={() => router.push('/sign-in')} style={{ marginTop: 22 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: 24 },
  word: { fontFamily: fonts.display, fontSize: 112, lineHeight: 104, letterSpacing: -6, color: '#FFFFFF', marginBottom: 18 },
  lede: { fontFamily: fonts.displaySemi, fontSize: 24, lineHeight: 29, color: '#FFFFFF' },
  body: { fontFamily: fonts.body, fontSize: 17, lineHeight: 25, color: 'rgba(255,255,255,0.9)', marginTop: 8, maxWidth: 340 },
  small: { fontFamily: fonts.body, fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 14 },
});
