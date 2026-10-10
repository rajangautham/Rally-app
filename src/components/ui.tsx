import type { ReactNode, Ref } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fonts, useTheme } from '@/lib/theme';

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------
type TxtVariant = 'body' | 'bold' | 'small' | 'label' | 'heading' | 'title';

const TXT = StyleSheet.create({
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24 },
  bold: { fontFamily: fonts.bodyBold, fontSize: 16, lineHeight: 24 },
  small: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  label: { fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 20 },
  heading: { fontFamily: fonts.displaySemi, fontSize: 19, lineHeight: 24 },
  title: { fontFamily: fonts.display, fontSize: 28, lineHeight: 32, letterSpacing: -0.5 },
});

export function Txt({ variant = 'body', color, style, ...rest }: TextProps & { variant?: TxtVariant; color?: string }) {
  const c = useTheme();
  const defaultColor = variant === 'small' ? c.muted : c.ink;
  return <Text {...rest} style={[TXT[variant], { color: color ?? defaultColor }, style]} />;
}

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------
type ButtonVariant = 'ball' | 'ink' | 'ghost' | 'danger' | 'support';

export function Button({
  label,
  onPress,
  variant = 'ink',
  disabled,
  loading,
  style,
  small,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  small?: boolean;
}) {
  const c = useTheme();
  const colors: Record<ButtonVariant, { bg: string; fg: string; border: string }> = {
    ball: { bg: c.ball, fg: c.ballInk, border: c.ball },
    ink: { bg: c.ink, fg: c.paper, border: c.ink },
    ghost: { bg: 'transparent', fg: c.ink, border: c.line },
    danger: { bg: c.danger, fg: c.onDanger, border: c.danger },
    support: { bg: c.support, fg: c.onSupport, border: c.support },
  };
  const v = colors[variant];
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        { backgroundColor: v.bg, borderColor: v.border, opacity: inactive ? 0.55 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <Text style={[styles.buttonText, small && { fontSize: 15 }, { color: v.fg }]}>{label}</Text>
      )}
    </Pressable>
  );
}

export function LinkButton({ label, onPress, danger }: { label: string; onPress: () => void; danger?: boolean }) {
  const c = useTheme();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={8} style={{ paddingVertical: 8 }}>
      <Text style={[TXT.label, { color: danger ? c.danger : c.support, textDecorationLine: 'underline' }]}>{label}</Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Chips
// ---------------------------------------------------------------------------
export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress: () => void }) {
  const c = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={[
        styles.chip,
        { backgroundColor: selected ? c.ink : c.surface, borderColor: selected ? c.ink : c.line },
      ]}
    >
      <Text style={[TXT.small, { color: selected ? c.paper : c.ink }]}>{label}</Text>
    </Pressable>
  );
}

export function Tag({ label, highlight }: { label: string; highlight?: boolean }) {
  const c = useTheme();
  return (
    <View style={[styles.tag, { backgroundColor: highlight ? c.ball : c.surface2 }]}>
      <Text style={[TXT.small, { fontSize: 13, color: highlight ? c.ballInk : c.ink, fontFamily: highlight ? fonts.bodyBold : fonts.body }]}>
        {label}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Form field
// ---------------------------------------------------------------------------
export function Field({
  label,
  hint,
  error,
  style,
  ref,
  ...input
}: TextInputProps & { label: string; hint?: string; error?: string | null; style?: StyleProp<ViewStyle>; ref?: Ref<TextInput> }) {
  const c = useTheme();
  return (
    <View style={[{ marginBottom: 16 }, style]}>
      <Txt variant="label" style={{ marginBottom: 6 }}>
        {label}
      </Txt>
      <TextInput
        ref={ref}
        accessibilityLabel={label}
        placeholderTextColor={c.muted}
        {...input}
        style={[styles.input, { borderColor: error ? c.danger : c.line, backgroundColor: c.surface, color: c.ink }]}
      />
      {hint ? <Txt variant="small" style={{ marginTop: 6 }}>{hint}</Txt> : null}
    </View>
  );
}

export function ErrorText({ children }: { children: string | null }) {
  const c = useTheme();
  if (!children) return null;
  return (
    <Txt variant="label" color={c.danger} accessibilityLiveRegion="polite" style={{ marginBottom: 12 }}>
      {children}
    </Txt>
  );
}

// ---------------------------------------------------------------------------
// Banner
// ---------------------------------------------------------------------------
export function Banner({ tone, children, style }: { tone: 'warn' | 'support' | 'danger'; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const c = useTheme();
  const map = {
    warn: { bg: c.warnBg, fg: c.warn },
    support: { bg: c.supportBg, fg: c.support },
    danger: { bg: c.dangerBg, fg: c.danger },
  };
  return (
    <View style={[styles.banner, { backgroundColor: map[tone].bg }, style]}>
      {typeof children === 'string' ? <Txt color={map[tone].fg} style={{ fontSize: 15 }}>{children}</Txt> : children}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Bottom sheet
// ---------------------------------------------------------------------------
export function Sheet({ visible, onClose, title, children }: { visible: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetWrap}>
        <Pressable accessibilityLabel="Close" style={[StyleSheet.absoluteFill, { backgroundColor: c.scrim }]} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: c.paper, paddingBottom: 18 + insets.bottom }]}>
          <Txt variant="title" style={{ fontSize: 22, lineHeight: 28, marginBottom: 8 }} accessibilityRole="header">
            {title}
          </Txt>
          {children}
        </View>
      </View>
    </Modal>
  );
}

export function Actions({ children, gap = 10 }: { children: ReactNode; gap?: number }) {
  return <View style={{ gap, marginTop: 14 }}>{children}</View>;
}

export function Quote({ children }: { children: string }) {
  const c = useTheme();
  return (
    <View style={[styles.quote, { borderLeftColor: c.accent, backgroundColor: c.surface2 }]}>
      <Txt>{children}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSmall: { minHeight: 40, paddingHorizontal: 14 },
  buttonText: { fontFamily: fonts.bodyBold, fontSize: 16 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 7 },
  tag: { borderRadius: 6, paddingHorizontal: 9, paddingVertical: 2 },
  input: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, minHeight: 48, fontFamily: fonts.body, fontSize: 16 },
  banner: { borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12 },
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 18, paddingTop: 22, maxHeight: '90%' },
  quote: { borderLeftWidth: 3, borderRadius: 10, borderTopLeftRadius: 0, borderBottomLeftRadius: 0, paddingHorizontal: 12, paddingVertical: 8, marginVertical: 8 },
});
