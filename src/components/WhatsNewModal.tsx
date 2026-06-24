import React from 'react';
import { View, Text, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/context/ThemeContext';
import { changelog } from '@/src/changelog';

type Props = {
  visible: boolean;
  onClose: () => void;
};

const MAX_HIGHLIGHTS = 4;

export function WhatsNewModal({ visible, onClose }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;

  const latest = changelog[0];
  const highlights = latest.changes.filter((c) => !c.startsWith('//')).slice(0, MAX_HIGHLIGHTS);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 24,
        }}>
        <View
          style={{
            backgroundColor: c.surface,
            borderRadius: 20,
            width: '100%',
            maxWidth: 360,
            padding: 24,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.3,
            shadowRadius: 16,
            elevation: 12,
          }}>
          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                backgroundColor: 'rgba(0,122,255,0.12)',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 12,
              }}>
              <Ionicons name="sparkles" size={24} color={c.accent} />
            </View>
            <Text style={{ fontSize: 20, fontWeight: '700', color: c.text, marginBottom: 4 }}>
              {"What's New"}
            </Text>
            <Text style={{ fontSize: 13, color: c.subtext }}>
              Version {latest.version} · {latest.date}
            </Text>
          </View>

          <View style={{ gap: 14, marginBottom: 24 }}>
            {highlights.map((item, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    backgroundColor: c.tagBg,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                  <Text style={{ fontSize: 14, color: c.accent, fontWeight: '700' }}>✦</Text>
                </View>
                <Text style={{ fontSize: 14, color: c.text, lineHeight: 20, flex: 1, paddingTop: 6 }}>
                  {item}
                </Text>
              </View>
            ))}
          </View>

          <Pressable
            onPress={onClose}
            style={{ backgroundColor: c.accent, borderRadius: 12, padding: 14, alignItems: 'center' }}>
            <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>{"Let's Go"}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
