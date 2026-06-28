import React from 'react';
import { View, ImageBackground, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/src/context/ThemeContext';

type Props = {
  // background color used when the active theme has no image
  color: string;
  // 'header' keeps the artwork visible (top bar / hero); 'panel' fades the image
  // to near-solid so list/content text stays clean and readable.
  variant?: 'header' | 'panel';
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
};

// Renders the active theme's takeover image with a vertical gradient scrim for
// depth + legibility when one is set; otherwise a plain colored surface.
export function ThemeBackdrop({ color, variant = 'panel', style, children }: Props) {
  const { theme } = useTheme();

  if (theme.backgroundImage) {
    const flat = theme.scrim ?? 'rgba(0,0,0,0.5)';
    const gradient =
      (variant === 'header' ? theme.scrimHeader : theme.scrimPanel) ?? [flat, flat];

    return (
      <ImageBackground source={theme.backgroundImage} resizeMode="cover" style={style}>
        <LinearGradient colors={gradient} style={StyleSheet.absoluteFill} />
        {children}
      </ImageBackground>
    );
  }

  return <View style={[style, { backgroundColor: color }]}>{children}</View>;
}
