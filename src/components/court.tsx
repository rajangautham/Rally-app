import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fonts, useTheme } from '@/lib/theme';

/** Badminton court markings, drawn with plain Views so no SVG library is needed. */
export function CourtLines({ opacity = 0.2, portrait = false }: { opacity?: number; portrait?: boolean }) {
  const line: ViewStyle = { position: 'absolute', borderColor: '#FFFFFF' };
  const v = (left: `${number}%`): ViewStyle => ({ ...line, left, top: 8, bottom: 8, borderLeftWidth: 1.5 });
  const h = (top: `${number}%`, left: `${number}%` = '2%', right: `${number}%` = '2%'): ViewStyle => ({ ...line, top, left, right, borderTopWidth: 1.5 });
  return (
    <View style={[StyleSheet.absoluteFill, { opacity, pointerEvents: 'none' }]}>
      <View style={{ ...line, top: 8, bottom: 8, left: '2%', right: '2%', borderWidth: 1.5 }} />
      {portrait ? (
        <>
          <View style={h('50%')} />
          <View style={h('35%')} />
          <View style={h('65%')} />
          <View style={h('8%')} />
          <View style={h('92%')} />
          <View style={{ ...line, left: '50%', top: 8, height: '35%', borderLeftWidth: 1.5 }} />
          <View style={{ ...line, left: '50%', top: '65%', bottom: 8, borderLeftWidth: 1.5 }} />
          <View style={v('10%')} />
          <View style={v('90%')} />
        </>
      ) : (
        <>
          <View style={v('50%')} />
          <View style={v('35%')} />
          <View style={v('65%')} />
          <View style={v('8%')} />
          <View style={v('92%')} />
          <View style={h('50%', '2%', '65%')} />
          <View style={h('50%', '65%', '2%')} />
          <View style={h('14%')} />
          <View style={h('86%')} />
        </>
      )}
    </View>
  );
}

export function CourtHeader({ title, subtitle, showSupport = true }: { title: string; subtitle?: string; showSupport?: boolean }) {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ backgroundColor: c.court, paddingTop: insets.top + 10, paddingHorizontal: 18, paddingBottom: 16, overflow: 'hidden' }}>
      <CourtLines />
      <View style={styles.row}>
        <Text style={styles.wordmark}>Rally</Text>
        {showSupport ? (
          <Pressable accessibilityRole="button" onPress={() => router.navigate('/support')} style={styles.pill}>
            <Ionicons name="help-buoy-outline" size={17} color="#FFFFFF" />
            <Text style={styles.pillText}>Need to talk?</Text>
          </Pressable>
        ) : null}
      </View>
      <Text accessibilityRole="header" style={[styles.title, subtitle ? { fontSize: 30, lineHeight: 34 } : null]}>
        {title}
      </Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  wordmark: { fontFamily: fonts.display, fontSize: 24, color: '#FFFFFF', letterSpacing: -0.7 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  pillText: { fontFamily: fonts.body, fontSize: 14, color: '#FFFFFF' },
  title: { fontFamily: fonts.display, fontSize: 24, lineHeight: 28, color: '#FFFFFF', marginTop: 14, letterSpacing: -0.4 },
  subtitle: { fontFamily: fonts.body, fontSize: 15, color: 'rgba(255,255,255,0.88)', marginTop: 4 },
});
