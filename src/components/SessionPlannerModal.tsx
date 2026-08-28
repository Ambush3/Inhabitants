import React, { useEffect, useState } from 'react';
import { Modal, View, Text, Pressable, Linking, ActionSheetIOS } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/context/ThemeContext';
import { Spot } from '@/src/types';
import {
  buildSessionRoute,
  describeRoute,
  formatMiles,
  googleMapsRouteUrl,
  SessionRoute,
} from '@/src/libs/sessionRoute';
import { showAlert } from '@/src/components/ui/ThemedAlert';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';

export function SessionPlannerModal({
  visible,
  onClose,
  title,
  spots,
  userLocation,
  onOpenSpot,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  spots: Spot[];
  userLocation: { latitude: number; longitude: number } | null;
  onOpenSpot?: (spot: Spot) => void;
}) {
  const { theme } = useTheme();
  const c = theme.colors;
  const [route, setRoute] = useState<SessionRoute>({ stops: [], totalMiles: 0 });

  useEffect(() => {
    if (!visible) return;
    setRoute(buildSessionRoute(spots, userLocation));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, spots.length]);

  function removeStop(index: number) {
    const ordered = route.stops.map((s) => s.spot).filter((_, i) => i !== index);
    setRoute(describeRoute(ordered, userLocation));
  }

  async function openFullRoute() {
    const url = googleMapsRouteUrl(
      route.stops.map((s) => s.spot),
      userLocation
    );
    if (!url) return;
    const ok = await Linking.canOpenURL(url);
    if (!ok) {
      showAlert('Could not open Maps', 'No maps app is available to open this route.');
      return;
    }
    await Linking.openURL(url);
  }

  function directionsTo(spot: Spot) {
    ActionSheetIOS.showActionSheetWithOptions(
      { options: ['Cancel', 'Open in Apple Maps', 'Open in Google Maps'], cancelButtonIndex: 0 },
      async (buttonIndex) => {
        if (buttonIndex === 1) {
          await Linking.openURL(`maps://app?daddr=${spot.lat},${spot.lng}`);
        } else if (buttonIndex === 2) {
          const url = `comgooglemaps://?daddr=${spot.lat},${spot.lng}&directionsmode=driving`;
          const canOpen = await Linking.canOpenURL(url);
          if (canOpen) {
            await Linking.openURL(url);
          } else {
            await Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${spot.lat},${spot.lng}`);
          }
        }
      }
    );
  }

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
            maxHeight: '88%',
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
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: c.text }}>Session plan</Text>
              <Text style={{ fontSize: 13, color: c.subtext, marginTop: 2 }} numberOfLines={1}>
                {title}
              </Text>
            </View>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={24} color={c.subtext} />
            </Pressable>
          </View>

          <View
            style={{
              flexDirection: 'row',
              gap: 16,
              paddingHorizontal: 20,
              paddingTop: 14,
              paddingBottom: 12,
            }}>
            <Stat label="Stops" value={`${route.stops.length}`} />
            <Stat label="Distance" value={formatMiles(route.totalMiles)} />
            <Stat label="Starts from" value={userLocation ? 'You' : (route.stops[0]?.spot.name ?? '—')} />
          </View>

          <View style={{ paddingHorizontal: 20, paddingBottom: 10 }}>
            <Text style={{ fontSize: 11, color: c.subtext }}>
              Hold and drag to reorder. Tap the arrow for Apple or Google Maps — multi-stop routes are Google Maps only.
            </Text>
          </View>

          {route.stops.length === 0 ? (
            <Text
              style={{
                color: c.subtext,
                fontSize: 14,
                paddingVertical: 28,
                textAlign: 'center',
              }}>
              No spots left in this plan.
            </Text>
          ) : (
            <DraggableFlatList
              style={{ flexShrink: 1 }}
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12 }}
              data={route.stops}
              keyExtractor={(stop) => stop.spot.id}
              onDragEnd={({ data }) =>
                setRoute(
                  describeRoute(
                    data.map((s) => s.spot),
                    userLocation
                  )
                )
              }
              activationDistance={12}
              renderItem={({ item: stop, drag, isActive, getIndex }) => {
                const i = getIndex() ?? 0;
                return (
                  <ScaleDecorator activeScale={1.03}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 10,
                        backgroundColor: c.tagBg,
                        borderRadius: 14,
                        paddingHorizontal: 12,
                        paddingVertical: 12,
                        marginBottom: 8,
                        opacity: isActive ? 0.92 : 1,
                      }}>
                      <Pressable
                        onLongPress={drag}
                        delayLongPress={120}
                        disabled={isActive}
                        hitSlop={8}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Ionicons name="reorder-three" size={20} color={c.subtext} />
                        <View
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: 13,
                            backgroundColor: c.accent,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800' }}>{i + 1}</Text>
                        </View>
                      </Pressable>

                      <Pressable
                        style={{ flex: 1 }}
                        onPress={() => onOpenSpot?.(stop.spot)}
                        onLongPress={drag}
                        delayLongPress={120}
                        disabled={!onOpenSpot}>
                        <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: '700', color: c.text }}>
                          {stop.spot.name}
                        </Text>
                        <Text style={{ fontSize: 12, color: c.subtext, marginTop: 2 }}>
                          {formatMiles(stop.legMiles)} from previous · {formatMiles(stop.cumulativeMiles)} total
                        </Text>
                      </Pressable>

                      <Pressable onPress={() => directionsTo(stop.spot)} hitSlop={6}>
                        <Ionicons name="navigate" size={18} color={c.accent} />
                      </Pressable>
                      <Pressable onPress={() => removeStop(i)} hitSlop={6}>
                        <Ionicons name="close-circle" size={18} color={c.subtext} />
                      </Pressable>
                    </View>
                  </ScaleDecorator>
                );
              }}
            />
          )}

          <View
            style={{
              flexDirection: 'row',
              gap: 12,
              paddingHorizontal: 20,
              paddingTop: 12,
              paddingBottom: 28,
              borderTopWidth: 1,
              borderTopColor: c.tagBg,
            }}>
            <Pressable
              onPress={() =>
                setRoute(
                  buildSessionRoute(
                    route.stops.map((s) => s.spot),
                    userLocation
                  )
                )
              }
              style={{
                paddingHorizontal: 16,
                justifyContent: 'center',
                borderRadius: 14,
                backgroundColor: c.tagBg,
              }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: c.text }}>Re-optimize</Text>
            </Pressable>
            <Pressable
              onPress={openFullRoute}
              disabled={route.stops.length === 0}
              style={{
                flex: 1,
                backgroundColor: route.stops.length === 0 ? c.tagBg : c.accent,
                borderRadius: 14,
                paddingVertical: 14,
                alignItems: 'center',
              }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '700',
                  color: route.stops.length === 0 ? c.subtext : '#fff',
                }}>
                Open in Google Maps
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );

  function Stat({ label, value }: { label: string; value: string }) {
    return (
      <View>
        <Text style={{ fontSize: 11, fontWeight: '700', color: c.subtext, letterSpacing: 0.5 }}>
          {label.toUpperCase()}
        </Text>
        <Text style={{ fontSize: 16, fontWeight: '800', color: c.text, marginTop: 2 }}>{value}</Text>
      </View>
    );
  }
}
