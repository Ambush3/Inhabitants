import React, { useState } from 'react';
import { View, Text, Pressable, Dimensions, Modal } from 'react-native';
import { useTheme } from '@/src/context/ThemeContext';

export type TourRect = { x: number; y: number; width: number; height: number };

export type TourTargets = {
  menu: TourRect | null;
  settings: TourRect | null;
};

type Props = {
  visible: boolean;
  targets: TourTargets;
  onFinish: () => void;
};

const RING_PADDING = 10;

export function MapTour({ visible, targets, onFinish }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const [stepIndex, setStepIndex] = useState(0);

  const { width: screenW, height: screenH } = Dimensions.get('window');

  const mapCentre: TourRect = {
    x: screenW / 2 - 55,
    y: screenH / 2 - 55,
    width: 110,
    height: 110,
  };

  const steps = [
    {
      key: 'add-spot',
      rect: mapCentre,
      round: true,
      title: 'Add a spot',
      body: 'Press and hold anywhere on the map to drop a new spot.',
    },
    {
      key: 'explore',
      rect: targets.menu,
      round: false,
      title: 'Explore',
      body: 'Find nearby skate parks and shops, plus your lists, crews, friends and profile.',
    },
    {
      key: 'settings',
      rect: targets.settings,
      round: false,
      title: 'Settings',
      body: 'Notifications, map style, your subscription, and the full How to Use guide.',
    },
  ].filter((s) => s.rect != null);

  if (!visible || steps.length === 0) return null;

  const step = steps[Math.min(stepIndex, steps.length - 1)];
  const rect = step.rect as TourRect;
  const isLast = stepIndex >= steps.length - 1;

  const ringX = rect.x - RING_PADDING;
  const ringY = rect.y - RING_PADDING;
  const ringW = rect.width + RING_PADDING * 2;
  const ringH = rect.height + RING_PADDING * 2;

  const cardBelow = ringY + ringH < screenH / 2;
  const cardTop = cardBelow ? ringY + ringH + 16 : undefined;
  const cardBottom = cardBelow ? undefined : screenH - ringY + 16;

  function next() {
    if (isLast) {
      onFinish();
      setStepIndex(0);
      return;
    }
    setStepIndex((i) => i + 1);
  }

  function skip() {
    onFinish();
    setStepIndex(0);
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={skip}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.72)' }}>
        <View
          style={{
            position: 'absolute',
            left: ringX,
            top: ringY,
            width: ringW,
            height: ringH,
            borderRadius: step.round ? ringW / 2 : 14,
            borderWidth: 3,
            borderColor: c.accent,
            backgroundColor: 'rgba(255,255,255,0.12)',
          }}
        />

        <View
          style={{
            position: 'absolute',
            left: 20,
            right: 20,
            top: cardTop,
            bottom: cardBottom,
            backgroundColor: c.surface,
            borderRadius: 16,
            padding: 18,
          }}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: c.text, marginBottom: 6 }}>
            {step.title}
          </Text>
          <Text style={{ fontSize: 14, color: c.subtext, lineHeight: 20 }}>{step.body}</Text>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 18,
            }}>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {steps.map((s, i) => (
                <View
                  key={s.key}
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 4,
                    backgroundColor: i === stepIndex ? c.accent : c.border,
                  }}
                />
              ))}
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <Pressable onPress={skip} hitSlop={8}>
                <Text style={{ fontSize: 15, color: c.subtext }}>Skip</Text>
              </Pressable>
              <Pressable
                onPress={next}
                style={{
                  backgroundColor: c.accent,
                  borderRadius: 10,
                  paddingVertical: 9,
                  paddingHorizontal: 20,
                }}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>
                  {isLast ? 'Done' : 'Next'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
