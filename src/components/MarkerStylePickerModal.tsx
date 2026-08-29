import React from 'react';
import { Modal, View, Text, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/context/ThemeContext';
import { useMarkerStyle } from '@/src/context/MarkerStyleContext';
import { MARKER_STYLES } from '@/src/config/markerStyles';
import { PinMarker } from '@/src/components/SpotMarkers/PinMarker';

export function MarkerStylePickerModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const { style, setStyle } = useMarkerStyle();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1 }}>
        <Pressable
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
          }}
          onPress={onClose}
        />
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            maxHeight: '80%',
            backgroundColor: c.surface,
            borderTopLeftRadius: 22,
            borderTopRightRadius: 22,
            paddingTop: 18,
          }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 20,
            }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: c.text }}>Your marker</Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={24} color={c.subtext} />
            </Pressable>
          </View>
          <Text style={{ paddingHorizontal: 20, fontSize: 13, color: c.subtext, marginTop: 4, marginBottom: 16 }}>
            Pick the symbol shown on the spots you add that belong to you.
          </Text>

          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              {MARKER_STYLES.map((option) => {
                const active = option.key === style.key;
                return (
                  <Pressable
                    key={option.key}
                    onPress={() => setStyle(option.key)}
                    style={{
                      width: '30%',
                      alignItems: 'center',
                      paddingVertical: 14,
                      borderRadius: 16,
                      borderWidth: 2,
                      borderColor: active ? c.accent : 'transparent',
                      backgroundColor: c.tagBg,
                    }}>
                    <PinMarker
                      color="#FFD700"
                      size={54}
                      glyphPath={option.path}
                      glyphViewBox={option.viewBox}
                      icon={require('@/assets/pin-images/SkateboardOnly.png')}
                      iconX={6}
                      iconY={8}
                      iconWidth={63}
                      iconHeight={63}
                    />
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '600',
                        color: active ? c.accent : c.subtext,
                        marginTop: 6,
                      }}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
