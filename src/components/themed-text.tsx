import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { Font, Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[
        { color: theme[themeColor ?? 'text'] },
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'subtitle' && styles.subtitle,
        type === 'link' && styles.link,
        type === 'linkPrimary' && [styles.linkPrimary, { color: theme.tint }],
        type === 'code' && styles.code,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  small: {
    fontFamily: Font.medium,
    fontSize: 14,
    lineHeight: 20,
  },
  smallBold: {
    fontFamily: Font.bold,
    fontSize: 14,
    lineHeight: 20,
  },
  default: {
    fontFamily: Font.medium,
    fontSize: 16,
    lineHeight: 24,
  },
  // Anton display — condensed uppercase. Screens add textTransform themselves.
  title: {
    fontFamily: Font.display,
    fontSize: 46,
    lineHeight: 48,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontFamily: Font.semibold,
    fontSize: 30,
    lineHeight: 40,
  },
  link: {
    fontFamily: Font.medium,
    lineHeight: 30,
    fontSize: 14,
  },
  linkPrimary: {
    fontFamily: Font.semibold,
    lineHeight: 30,
    fontSize: 14,
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: 700 }) ?? 500,
    fontSize: 12,
  },
});
