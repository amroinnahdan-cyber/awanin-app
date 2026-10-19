import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { X } from 'lucide-react-native';

import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import { font, radius, spacing, type as typo, type ThemeColors } from '@/theme/tokens';

/**
 * Bottom sheet used by the location picker and by the profile's setting rows.
 * Height follows the content, capped so a long list scrolls instead of pushing
 * the sheet off screen.
 */
export function Sheet({
  visible,
  title,
  subtitle,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable
          style={styles.scrim}
          accessibilityRole="button"
          accessibilityLabel="Tutup"
          onPress={onClose}
        />
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <View style={styles.head}>
            <View style={styles.headText}>
              <Text style={styles.title}>{title}</Text>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Tutup"
              hitSlop={10}
              onPress={onClose}
              style={({ pressed }) => [styles.close, pressed && styles.pressed]}
            >
              <X size={19} color={colors.mutedText} strokeWidth={2} />
            </Pressable>
          </View>
          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/** Tappable row inside a sheet: leading icon, label, optional trailing value. */
export function SheetRow({
  icon,
  label,
  hint,
  value,
  onPress,
  trailing,
}: {
  icon?: ReactNode;
  label: string;
  hint?: string;
  value?: string;
  onPress?: () => void;
  trailing?: ReactNode;
}) {
  const styles = useThemedStyles(createStyles);

  const content = (
    <>
      {icon ? <View style={styles.rowIcon}>{icon}</View> : null}
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        {hint ? <Text style={styles.rowHint}>{hint}</Text> : null}
      </View>
      {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      {trailing}
    </>
  );

  if (!onPress) return <View style={styles.row}>{content}</View>;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      {content}
    </Pressable>
  );
}

/** Setting with a real switch — the profile's notification toggles. */
export function SwitchRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        {hint ? <Text style={styles.rowHint}>{hint}</Text> : null}
      </View>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.border, true: colors.accent }}
        thumbColor={colors.surface}
      />
    </View>
  );
}

/** Two-or-more way choice, e.g. °C / °F or Terang / Gelap / Sistem. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.segmented}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={option.label}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.segment,
              active && styles.segmentActive,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return {
    overlay: {
      flex: 1,
      justifyContent: 'flex-end' as const,
      backgroundColor: colors.scrim,
    },
    scrim: {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    sheet: {
      maxHeight: '82%' as const,
      backgroundColor: colors.surface,
      borderTopLeftRadius: 26,
      borderTopRightRadius: 26,
      paddingTop: 10,
    },
    grabber: {
      alignSelf: 'center' as const,
      width: 42,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
    },
    head: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 12,
      paddingHorizontal: spacing.gutter,
      paddingTop: 14,
      paddingBottom: 10,
    },
    headText: {
      flex: 1,
      gap: 2,
    },
    title: {
      ...typo.title,
      color: colors.ink,
    },
    subtitle: {
      ...typo.caption,
      color: colors.mutedText,
    },
    close: {
      width: 32,
      height: 32,
      borderRadius: radius.pill,
      backgroundColor: colors.tint,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    pressed: {
      opacity: 0.6,
    },
    body: {
      paddingHorizontal: spacing.gutter,
    },
    bodyContent: {
      paddingBottom: 28,
      gap: 4,
    },
    row: {
      minHeight: 58,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 12,
      paddingHorizontal: 6,
      borderRadius: radius.control,
    },
    rowPressed: {
      backgroundColor: colors.tint,
    },
    rowIcon: {
      width: 34,
      height: 34,
      borderRadius: radius.pill,
      backgroundColor: colors.tint,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    rowText: {
      flex: 1,
      gap: 1,
    },
    rowLabel: {
      ...typo.body,
      fontFamily: font.bold,
      color: colors.ink,
    },
    rowHint: {
      ...typo.caption,
      color: colors.mutedText,
    },
    rowValue: {
      ...typo.body,
      color: colors.mutedText,
    },
    segmented: {
      height: 42,
      borderRadius: radius.pill,
      backgroundColor: colors.tint,
      padding: 4,
      flexDirection: 'row' as const,
      gap: 4,
      marginTop: 6,
    },
    segment: {
      flex: 1,
      borderRadius: radius.pill,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    segmentActive: {
      backgroundColor: colors.accent,
    },
    segmentLabel: {
      ...typo.stat,
      fontFamily: font.bold,
      color: colors.mutedText,
    },
    segmentLabelActive: {
      color: colors.onAccent,
    },
  };
}
