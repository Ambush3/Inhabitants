import React from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  ImageBackground,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemeOption } from '@/src/context/ThemeContext';

type Props = {
  visible: boolean;
  onClose: () => void;
};

function ThemeCard({
  option,
  selected,
  onPress,
}: {
  option: ThemeOption;
  selected: boolean;
  onPress: () => void;
}) {
  const col = option.theme.colors;
  return (
    <Pressable
      onPress={onPress}
      style={{
        height: 96,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: selected ? 3 : 1,
        borderColor: selected ? option.swatch : 'rgba(255,255,255,0.12)',
      }}>
      {option.theme.backgroundImage ? (
        <ImageBackground
          source={option.theme.backgroundImage}
          resizeMode="cover"
          style={{ flex: 1 }}>
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: option.theme.scrim ?? 'rgba(0,0,0,0.45)' },
            ]}
          />
          <CardContent name={option.name} textColor="#fff" accent={option.swatch} selected={selected} />
        </ImageBackground>
      ) : (
        <View style={{ flex: 1, backgroundColor: col.background, flexDirection: 'row' }}>
          {/* accent stripe */}
          <View style={{ width: 10, backgroundColor: col.accent }} />
          <View style={{ flex: 1, backgroundColor: col.panelBg }}>
            <CardContent name={option.name} textColor={col.text} accent={col.accent} selected={selected} />
          </View>
        </View>
      )}
    </Pressable>
  );
}

function CardContent({
  name,
  textColor,
  accent,
  selected,
}: {
  name: string;
  textColor: string;
  accent: string;
  selected: boolean;
}) {
  return (
    <View
      style={{
        flex: 1,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
      <Text style={{ fontSize: 18, fontWeight: '800', color: textColor }}>{name}</Text>
      {selected ? (
        <Ionicons name="checkmark-circle" size={26} color={accent} />
      ) : (
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 11,
            borderWidth: 2,
            borderColor: 'rgba(255,255,255,0.5)',
          }}
        />
      )}
    </View>
  );
}

export function ThemePickerModal({ visible, onClose }: Props) {
  const { theme, themeId, themes, setThemeId } = useTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderColor: c.border,
          }}>
          <Text style={{ flex: 1, fontSize: 20, fontWeight: '700', color: c.text }}>Themes</Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={26} color={c.text} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
          <Text style={{ fontSize: 13, color: c.subtext, marginBottom: 4 }}>
            Tap a theme to preview it live. Your choice saves automatically.
          </Text>
          {themes.map((t) => (
            <ThemeCard
              key={t.id}
              option={t}
              selected={t.id === themeId}
              onPress={() => setThemeId(t.id)}
            />
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}
