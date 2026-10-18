import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';

import { DeviceStatusBar } from '@/components/DeviceStatusBar';
import { FadeIn } from '@/components/motion';
import { Card } from '@/components/ui';
import { useTopInset } from '@/hooks/useTopInset';
import { useBackOrHome } from '@/lib/navigation';
import { color, spacing, type as typo } from '@/theme/tokens';

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
          <ArrowLeft size={20} color={color.accent} strokeWidth={1.8} />
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
  return <Text style={styles.paragraph}>{children}</Text>;
}

/** Question + answer, used by the help screen. */
export function InfoFaq({ question, children }: { question: string; children: ReactNode }) {
  return (
    <View style={styles.faq}>
      <Text style={styles.question}>{question}</Text>
      <Text style={styles.paragraph}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: color.bg,
  },
  content: {
    paddingBottom: 40,
  },
  header: {
    minHeight: 56,
    paddingHorizontal: spacing.gutter,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerText: {
    flex: 1,
    gap: 1,
  },
  headerTitle: {
    ...typo.title,
    color: color.ink,
  },
  headerSubtitle: {
    ...typo.caption,
    color: color.mutedText,
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
    color: color.ink,
  },
  paragraph: {
    ...typo.body,
    color: color.mutedText,
  },
  faq: {
    gap: 3,
  },
  question: {
    ...typo.body,
    fontFamily: typo.heading.fontFamily,
    color: color.ink,
  },
});
