import React from 'react';
import { View, ImageBackground, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/src/context/ThemeContext';

type Props = {
  // background color used when the active theme has no image
  color: string;
  variant?: 'header' | 'panel';
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
};

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
