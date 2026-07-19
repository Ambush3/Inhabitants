import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/context/ThemeContext';
import { useToast, ToastHost } from '@/src/context/ToastContext';
import { useCrews } from '@/src/hooks/useCrews';
import { supabase } from '@/src/libs/supabase';

type Props = {
  visible: boolean;
  onClose: () => void;
  spotId: string | null;
};

export function AddSpotToCrewModal({ visible, onClose, spotId }: Props) {
  const { theme } = useTheme();
  const toast = useToast();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const { myCrews, loadingMine, loadMyCrews, addSpotToCrew, removeSpotFromCrew } = useCrews();

  const [memberCrewIdsWithSpot, setMemberCrewIdsWithSpot] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [loadingMembership, setLoadingMembership] = useState(false);

  const loadMembership = useCallback(async () => {
    if (!spotId || myCrews.length === 0) {
      setMemberCrewIdsWithSpot(new Set());
      return;
    }
    setLoadingMembership(true);
    const { data } = await supabase
      .from('crew_spots')
      .select('crew_id')
      .eq('spot_id', spotId)
      .in(
        'crew_id',
        myCrews.map((c) => c.id)
      );
    setMemberCrewIdsWithSpot(new Set((data ?? []).map((r: any) => r.crew_id)));
    setLoadingMembership(false);
  }, [spotId, myCrews]);

  useEffect(() => {
    if (visible) loadMyCrews();
  }, [visible, loadMyCrews]);

  useEffect(() => {
    if (visible) loadMembership();
  }, [visible, loadMembership]);

  async function toggle(crewId: string) {
    if (!spotId) return;
    if (pending.has(crewId)) return;
    setPending((p) => new Set(p).add(crewId));
    const isAdded = memberCrewIdsWithSpot.has(crewId);
    const err = isAdded
      ? await removeSpotFromCrew(crewId, spotId)
      : await addSpotToCrew(crewId, spotId);
    if (err) {
      toast.error(err);
    } else {
      setMemberCrewIdsWithSpot((prev) => {
        const next = new Set(prev);
        if (isAdded) next.delete(crewId);
        else next.add(crewId);
        return next;
      });
    }
    setPending((p) => {
      const next = new Set(p);
      next.delete(crewId);
      return next;
    });
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: c.background }}>
        <View
          style={{
            paddingTop: insets.top + 8,
            paddingBottom: 12,
            paddingHorizontal: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottomWidth: 1,
            borderColor: c.border,
          }}>
          <Pressable onPress={onClose} hitSlop={10}>
            <Text style={{ color: c.subtext, fontSize: 16 }}>Done</Text>
          </Pressable>
          <Text style={{ fontWeight: '700', fontSize: 17, color: c.text }}>Add to Crew</Text>
          <View style={{ width: 30 }} />
        </View>

        {loadingMine || loadingMembership ? (
          <View style={{ paddingVertical: 24, alignItems: 'center' }}>
            <ActivityIndicator color={c.text} />
          </View>
        ) : myCrews.length === 0 ? (
          <View style={{ padding: 24, alignItems: 'center', gap: 8 }}>
            <Ionicons name="people-outline" size={32} color={c.subtext} />
            <Text style={{ color: c.subtext, textAlign: 'center' }}>
              You aren't in any crews yet. Create one from the Mine tab.
            </Text>
          </View>
        ) : (
          <ScrollView>
            {myCrews.map((crew) => {
              const added = memberCrewIdsWithSpot.has(crew.id);
              const busy = pending.has(crew.id);
              return (
                <Pressable
                  key={crew.id}
                  onPress={() => toggle(crew.id)}
                  disabled={busy}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderBottomWidth: 1,
                    borderColor: c.border,
                    gap: 12,
                    opacity: busy ? 0.5 : 1,
                  }}>
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: c.border,
                      justifyContent: 'center',
                      alignItems: 'center',
                      overflow: 'hidden',
                    }}>
                    {crew.avatar_url ? (
                      <Image
                        source={{ uri: crew.avatar_url }}
                        style={{ width: 40, height: 40, borderRadius: 20 }}
                      />
                    ) : (
                      <Ionicons name="people" size={20} color={c.subtext} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: c.text, fontWeight: '700' }}>{crew.name}</Text>
                    <Text style={{ color: c.subtext, fontSize: 12, marginTop: 2 }}>
                      {crew.member_count ?? 0} members · {crew.spot_count ?? 0} spots
                    </Text>
                  </View>
                  {busy ? (
                    <ActivityIndicator color={c.text} />
                  ) : added ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Ionicons name="checkmark-circle" size={22} color={c.buttonBg} />
                      <Text style={{ color: c.buttonBg, fontWeight: '600', fontSize: 12 }}>
                        Added
                      </Text>
                    </View>
                  ) : (
                    <View
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: c.buttonBg,
                      }}>
                      <Text style={{ color: c.buttonBg, fontWeight: '600', fontSize: 12 }}>
                        Add
                      </Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </View>
      {visible ? <ToastHost /> : null}
    </Modal>
  );
}
