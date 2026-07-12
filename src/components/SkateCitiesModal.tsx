import React from 'react';
import { View, Text, Modal, ScrollView, Pressable, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/context/ThemeContext';
import { SkateCity, SKATE_CITIES } from '@/src/data/skateCities';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelectCity: (city: SkateCity) => void;
};

export function SkateCitiesModal({ visible, onClose, onSelectCity }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderColor: c.border,
          }}>
          <Pressable onPress={onClose} style={{ padding: 4 }}>
            <Ionicons name="close" size={24} color={c.text} />
          </Pressable>
          <Text style={{ flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: c.text }}>
            Cities
          </Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
          <Text style={{ color: c.subtext, fontSize: 13, marginBottom: 16 }}>
            Jump to a city and see its top-rated spots.
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {SKATE_CITIES.map((city) => (
              <Pressable
                key={city.id}
                onPress={() => onSelectCity(city)}
                style={{
                  width: '47.5%',
                  height: 150,
                  borderRadius: 16,
                  backgroundColor: city.color,
                  padding: 16,
                  justifyContent: 'flex-end',
                }}>
                <Text
                  style={{ color: 'white', fontWeight: '800', fontSize: 22, lineHeight: 26 }}
                  numberOfLines={2}>
                  {city.name}
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 4 }}>
                  {city.country}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
