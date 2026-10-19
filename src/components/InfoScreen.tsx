import type { ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';

import { DeviceStatusBar } from '@/components/DeviceStatusBar';
import { FadeIn } from '@/components/motion';
import { Card } from '@/components/ui';
import { useTopInset } from '@/hooks/useTopInset';
import { useBackOrHome } from '@/lib/navigation';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import { spacing, type as typo, type ThemeColors } from '@/theme/tokens';

/**
 * Shared layout for the text screens behind the profile (Tentang, Bantuan,
 * Privasi): back header, gutter, and stacked cards.
 */
export function InfoScreen({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const topInset = useTopInset();
  const goBack = useBackOrHome('/profil');
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={{ paddingTop: topInset }}>
        <DeviceStatusBar />
      </View>

      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Kembali"
          hitSlop={12}
          onPress={goBack}
          style={({ pressed }) => [pressed && styles.pressed]}
        >
          <ArrowLeft size={20} color={colors.accent} strokeWidth={1.8} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>{title}</Text>
          {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
        </View>
      </View>

      <View style={styles.sections}>{children}</View>
    </ScrollView>
  );
}

/** A titled block of prose. */
export function InfoSection({
  title,
  children,
  delay = 0,
}: {
  title?: string;
  children: ReactNode;
  delay?: number;
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <FadeIn delay={delay}>
      <Card style={styles.card}>
        {title ? <Text style={styles.cardTitle}>{title}</Text> : null}
        {children}
      </Card>
    </FadeIn>
  );
}

export function InfoParagraph({ children }: { children: ReactNode }) {
  const styles = useThemedStyles(createStyles);
  return <Text style={styles.paragraph}>{children}</Text>;
}

/** Question + answer, used by the help screen. */
export function InfoFaq({ question, children }: { question: string; children: ReactNode }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.faq}>
      <Text style={styles.question}>{question}</Text>
      <Text style={styles.paragraph}>{children}</Text>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return {
    screen: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    content: {
      paddingBottom: 40,
    },
    header: {
      minHeight: 56,
      paddingHorizontal: spacing.gutter,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 12,
    },
    headerText: {
      flex: 1,
      gap: 1,
    },
    headerTitle: {
      ...typo.title,
      color: colors.ink,
    },
    headerSubtitle: {
      ...typo.caption,
      color: colors.mutedText,
    },
    sections: {
      paddingHorizontal: spacing.gutter,
      gap: spacing.section,
    },
    pressed: {
      opacity: 0.6,
    },
    card: {
      padding: 16,
      gap: 10,
    },
    cardTitle: {
      ...typo.bodyStrong,
      color: colors.ink,
    },
    paragraph: {
      ...typo.body,
      color: colors.mutedText,
    },
    faq: {
      gap: 3,
    },
    question: {
      ...typo.body,
      fontFamily: typo.heading.fontFamily,
      color: colors.ink,
    },
  };
}
