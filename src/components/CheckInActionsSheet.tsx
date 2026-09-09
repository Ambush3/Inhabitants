import React from 'react';
import { ActivityIndicator, Modal, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/src/context/ThemeContext';
import { CrownIcon } from '@/src/components/icons/CrownIcon';

type Props = {
  visible: boolean;
  placeName: string;
  sessionTitle?: string | null;
  addedToSession: boolean;
  addingToSession: boolean;
  isPro: boolean;
  onAddToSession?: () => Promise<boolean>;
  tagLabel?: string;
  onTag: () => void;
  onAddSessionMedia?: () => void;
  onAddPhoto: () => void;
  onLogTrick?: () => void;
  onUndo?: () => void;
  onClose: () => void;
};

export function CheckInActionsSheet({
  visible,
  placeName,
  sessionTitle,
  addedToSession,
  addingToSession,
  isPro,
  onAddToSession,
  tagLabel = 'Tag Who You Skated With',
  onTag,
  onAddSessionMedia,
  onAddPhoto,
  onLogTrick,
  onUndo,
  onClose,
}: Props) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const c = theme.colors;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.42)', justifyContent: 'flex-end' }}>
        <Pressable onPress={() => {}} style={{ backgroundColor: c.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 18, paddingBottom: Math.max(insets.bottom, 18) }}>
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <View style={{ width: 38, height: 4, borderRadius: 2, backgroundColor: c.border }} />
          </View>
          <Text style={{ color: c.text, fontSize: 21, fontWeight: '800' }}>Check-in saved</Text>
          <Text style={{ color: c.subtext, marginTop: 4, marginBottom: 16 }} numberOfLines={1}>{placeName}</Text>
          {addedToSession ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(52,199,89,0.12)', borderRadius: 12, padding: 12, marginBottom: 10 }}>
              <Ionicons name="checkmark-circle" size={20} color="#34C759" />
              <Text style={{ color: c.text, fontWeight: '700', marginLeft: 8, flex: 1 }}>Added to {sessionTitle ?? 'your live session'}</Text>
            </View>
          ) : onAddToSession ? (
            <ActionRow icon="radio-outline" label={`Add to ${sessionTitle ?? 'Live Session'}`} onPress={async () => { await onAddToSession(); }} loading={addingToSession} c={c} />
          ) : null}
          <ActionRow icon="people-outline" label={tagLabel} onPress={onTag} c={c} />
          {addedToSession && onAddSessionMedia ? (
            <ActionRow icon={isPro ? 'camera-outline' : 'camera-outline'} label="Add Photo or Clip to Session" trailing={isPro ? undefined : <CrownIcon size={20} />} onPress={onAddSessionMedia} c={c} />
          ) : (
            <ActionRow icon="images-outline" label="Add Photo or Clip" onPress={onAddPhoto} c={c} />
          )}
          {onLogTrick ? <ActionRow icon="sparkles-outline" label="Log a Trick" onPress={onLogTrick} c={c} /> : null}
          <Pressable onPress={onClose} style={{ paddingVertical: 14, alignItems: 'center', marginTop: 4 }}><Text style={{ color: c.accent, fontWeight: '800', fontSize: 16 }}>Done</Text></Pressable>
          {onUndo ? <Pressable onPress={onUndo} style={{ paddingVertical: 8, alignItems: 'center' }}><Text style={{ color: c.danger, fontSize: 13, fontWeight: '700' }}>Undo Check-In</Text></Pressable> : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function ActionRow({ icon, label, onPress, loading, trailing, c }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; loading?: boolean; trailing?: React.ReactNode; c: any }) {
  return <Pressable onPress={onPress} disabled={loading} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.tagBg, borderRadius: 13, paddingHorizontal: 14, paddingVertical: 14, marginBottom: 8, opacity: loading ? 0.6 : 1 }}><Ionicons name={icon} size={20} color={c.accent} /><Text style={{ color: c.text, fontWeight: '700', flex: 1, marginLeft: 10 }}>{loading ? 'Adding to session…' : label}</Text>{loading ? <ActivityIndicator size="small" color={c.accent} /> : trailing ?? <Ionicons name="chevron-forward" size={18} color={c.subtext} />}</Pressable>;
}
