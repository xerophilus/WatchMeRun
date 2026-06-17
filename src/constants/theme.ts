/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#0A0A0B',
    background: '#F3F3F1',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#EFEFEC',
    textSecondary: 'rgba(10,10,11,0.55)',
    /** Single brand accent (blue) — active states, route, today, A-race. */
    tint: '#3B82F6',
    accent: '#3B82F6',
  },
  dark: {
    text: '#FFFFFF',
    background: '#0A0A0B',
    backgroundElement: '#161619',
    backgroundSelected: '#232328',
    textSecondary: 'rgba(255,255,255,0.56)',
    tint: '#3B82F6',
    accent: '#3B82F6',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/**
 * Brand fonts (loaded in the root layout via expo-google-fonts). Anton is the
 * condensed uppercase display face (screen titles + big numbers); Archivo is the
 * body face. On React Native each weight is its own family, so map weight → name.
 */
export const Font = {
  display: 'Anton_400Regular',
  regular: 'Archivo_400Regular',
  medium: 'Archivo_500Medium',
  semibold: 'Archivo_600SemiBold',
  bold: 'Archivo_700Bold',
} as const;

/** Add an alpha channel to a `#rrggbb` hex color, returning an `rgba()` string. */
export function withAlpha(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
