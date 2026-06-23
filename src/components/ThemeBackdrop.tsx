import React from 'react';
import { View, ImageBackground, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '@/src/context/ThemeContext';

type Props = {
  // background color used when the active theme has no image
  color: string;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
};

// Renders the active theme's takeover image (with a legibility scrim) when one
// is set; otherwise a plain colored surface. Used on the Explore/Settings
// panels and the map top bar.
export function ThemeBackdrop({ color, style, children }: Props) {
  const { theme } = useTheme();

  if (theme.backgroundImage) {
    return (
      <ImageBackground source={theme.backgroundImage} resizeMode="cover" style={style}>
        <View
          style={[StyleSheet.absoluteFill, { backgroundColor: theme.scrim ?? 'rgba(0,0,0,0.5)' }]}
        />
        {children}
      </ImageBackground>
    );
  }

  return <View style={[style, { backgroundColor: color }]}>{children}</View>;
}
