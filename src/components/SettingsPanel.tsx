import React, { useState, useEffect } from 'react';
import { showAlert, AlertHost } from '@/src/components/ui/ThemedAlert';
import { View, Text, Modal, Pressable, Switch, ScrollView, Linking } from 'react-native';
import { usePro } from '@/src/context/ProContext';
import { PaywallModal } from '@/src/components/PaywallModal';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/src/libs/supabase';
import { Session } from '@supabase/supabase-js';
import { useTheme } from '@/src/context/ThemeContext';
import { useMapProvider } from '@/src/context/MapProviderContext';
import { useToast, ToastHost } from '@/src/context/ToastContext';
import { changelog } from '@/src/changelog';
import { useNotificationPreferences, NotificationPrefs } from '@/src/hooks/useNotificationPreferences';
import { FeedbackBoardModal } from '@/src/components/feedback/FeedbackBoardModal';
import { ThemeBackdrop } from '@/src/components/ThemeBackdrop';
import { ThemePickerModal } from '@/src/components/ThemePickerModal';

import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { decode } from 'base64-arraybuffer';
import * as Application from 'expo-application';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSignOut: () => void;
  onShowOnboarding: () => void;
  session: Session | null;
  initialFeedbackPostId?: string | null;
};

function SectionLabel({ label }: { label: string }) {
  const { theme } = useTheme();
  return (
    <Text
      style={{
        fontSize: 11,
        fontWeight: '600',
        color: theme.colors.subtext,
        letterSpacing: 0.8,
        marginTop: 20,
        marginBottom: 4,
      }}>
      {label}
    </Text>
  );
}

export function SettingsPanel({
  visible,
  onClose,
  onSignOut,
  onShowOnboarding,
  session,
  initialFeedbackPostId,
}: Props) {
  const insets = useSafeAreaInsets();
  const [resetSent, setResetSent] = useState(false);
  const [changelogOpen, setChangelogOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [themePickerOpen, setThemePickerOpen] = useState(false);
  const { theme, themeId, themes } = useTheme();
  const { mapProvider, setMapProvider } = useMapProvider();
  const toast = useToast();
  const { isPro, restore } = usePro();
  const [proPaywallOpen, setProPaywallOpen] = useState(false);

  async function handleRestore() {
    try {
      const ok = await restore();
      toast.show(ok ? 'Purchases restored' : 'Nothing to restore');
    } catch {
      toast.error('Restore failed');
    }
  }
  const c = theme.colors;
  const currentThemeName = themes.find((t) => t.id === themeId)?.name ?? '';

  // Deep link: a feedback-reply notification opens the board on that post.
  useEffect(() => {
    if (visible && initialFeedbackPostId) setFeedbackOpen(true);
  }, [visible, initialFeedbackPostId]);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [username, setUsername] = useState<string | null>(null);

  const { prefs, loadPrefs, updatePref } = useNotificationPreferences();
  const [notifSectionOpen, setNotifSectionOpen] = useState(false);
  const [publicCheckIns, setPublicCheckIns] = useState(true);

  useEffect(() => {
    if (visible) loadPrefs();
  }, [visible]);

  useEffect(() => {
    async function loadAvatar() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('avatar_url, username, public_check_ins')
        .eq('id', user.id)
        .single();
      setAvatarUrl(data?.avatar_url ?? null);
      setUsername(data?.username ?? null);
      setPublicCheckIns(data?.public_check_ins ?? true);
    }
    if (visible) loadAvatar();
  }, [visible]);

  async function handleResetPassword() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: 'inhabitants://reset-password',
    });
    if (error) {
      toast.error(error.message);
    } else {
      setResetSent(true);
      toast.success('Check your inbox for a password reset link.');
    }
  }

  async function handleAvatarUpload() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (result.canceled) return;

    setAvatarLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setAvatarLoading(false);
      return;
    }

    const compressed = await manipulateAsync(result.assets[0].uri, [{ resize: { width: 300 } }], {
      compress: 0.8,
      format: SaveFormat.JPEG,
      base64: true,
    });
    if (!compressed.base64) {
      setAvatarLoading(false);
      return;
    }

    const filename = `${user.id}.jpg`;
    await supabase.storage.from('avatars').upload(filename, decode(compressed.base64), {
      contentType: 'image/jpeg',
      upsert: true,
    });

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filename, decode(compressed.base64), {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (uploadError) {
      setAvatarLoading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filename);
    const freshUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    const { data: moderationResult } = await supabase.functions.invoke('moderate-image', {
      body: { image_url: freshUrl, spot_id: null, user_id: user.id },
    });

    if (moderationResult?.safe === false) {
      await supabase.storage.from('avatars').remove([filename]);
      toast.error(
        'Your profile photo was flagged as inappropriate. Please choose a different image.'
      );
      setAvatarLoading(false);
      return;
    }

    await supabase.from('profiles').update({ avatar_url: freshUrl }).eq('id', user.id);
    setAvatarUrl(null);
    setAvatarUrl(freshUrl);
    setAvatarLoading(false);
  }

  function handleDeleteAccount() {
    showAlert(
      'Delete Account',
      'This will permanently delete your account and all your data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.rpc('delete_user');
            if (error) {
              toast.error(error.message);
            } else {
              await supabase.auth.signOut();
              onSignOut();
            }
          },
        },
      ]
    );
  }

  const rowStyle = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderColor: c.border,
  };

  const rowLeftStyle = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {visible ? <AlertHost /> : null}
      {visible ? <ToastHost /> : null}
      <PaywallModal visible={proPaywallOpen} onClose={() => setProPaywallOpen(false)} />
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }} onPress={onClose}>
          <Pressable
            style={{
              position: 'absolute',
              right: 0,
              paddingTop: insets.top,
              width: 280,
              height: '100%',
              backgroundColor: 'transparent',
              flexDirection: 'column',
            }}
            onPress={() => { }}>
            <ThemeBackdrop color={c.panelBg} style={{ flex: 1, padding: 16, flexDirection: 'column' }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
              <Ionicons name="settings-outline" size={20} color={c.text} style={{ marginRight: 8 }} />
              <Text style={{ fontSize: 18, fontWeight: '600', color: c.text }}>Settings</Text>
            </View>
            {/* Avatar */}
            {session ? (
              <View style={{ alignItems: 'center', marginBottom: 8 }}>
                <Pressable onPress={handleAvatarUpload}>
                  {avatarUrl ? (
                    <Image
                      source={{ uri: avatarUrl }}
                      style={{ width: 72, height: 72, borderRadius: 36, marginBottom: 8 }}
                    />
                  ) : (
                    <View
                      style={{
                        width: 72,
                        height: 72,
                        borderRadius: 36,
                        backgroundColor: c.tagBg,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 8,
                      }}>
                      <Ionicons name="person-outline" size={32} color={c.subtext} />
                    </View>
                  )}
                </Pressable>
                {username ? (
                  <Text style={{ fontSize: 14, fontWeight: '600', color: c.text, marginBottom: 4 }}>
                    @{username}
                  </Text>
                ) : null}
                <Pressable onPress={handleAvatarUpload}>
                  <Text style={{ fontSize: 13, color: c.accent }}>
                    {avatarLoading ? 'Uploading...' : 'Change Photo'}
                  </Text>
                </Pressable>
              </View>
            ) : (
              <View style={{ alignItems: 'center', marginBottom: 16 }}>
                <View
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 36,
                    backgroundColor: c.tagBg,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 8,
                  }}>
                  <Ionicons name="person-outline" size={32} color={c.subtext} />
                </View>
                <Text
                  style={{
                    fontSize: 13,
                    color: c.subtext,
                    textAlign: 'center',
                    paddingHorizontal: 8,
                  }}>
                  Sign in to manage your profile
                </Text>
              </View>
            )}
            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
              {session ? (
                <>
                  <SectionLabel label="INHABITANTS PRO" />
                  {isPro ? (
                    <>
                      <View style={rowStyle}>
                        <View style={rowLeftStyle}>
                          <Ionicons name="star" size={20} color={c.accent} />
                          <Text style={{ fontSize: 15, color: c.text }}>Pro — Active</Text>
                        </View>
                        <Ionicons name="checkmark-circle" size={20} color="#34C759" />
                      </View>
                      <Pressable
                        style={rowStyle}
                        onPress={() =>
                          Linking.openURL('https://apps.apple.com/account/subscriptions')
                        }>
                        <View style={rowLeftStyle}>
                          <Ionicons name="card-outline" size={20} color={c.text} />
                          <Text style={{ fontSize: 15, color: c.text }}>Manage Subscription</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={c.subtext} />
                      </Pressable>
                    </>
                  ) : (
                    <>
                      <Pressable style={rowStyle} onPress={() => setProPaywallOpen(true)}>
                        <View style={rowLeftStyle}>
                          <Ionicons name="star-outline" size={20} color={c.accent} />
                          <Text style={{ fontSize: 15, fontWeight: '600', color: c.text }}>
                            Upgrade to Pro
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={c.subtext} />
                      </Pressable>
                      <Pressable style={rowStyle} onPress={handleRestore}>
                        <View style={rowLeftStyle}>
                          <Ionicons name="refresh-outline" size={20} color={c.text} />
                          <Text style={{ fontSize: 15, color: c.text }}>Restore Purchases</Text>
                        </View>
                      </Pressable>
                    </>
                  )}
                </>
              ) : null}
              {/* ── APPEARANCE ── */}
              <SectionLabel label="APPEARANCE" />
              <Pressable onPress={() => setThemePickerOpen(true)} style={rowStyle}>
                <View style={rowLeftStyle}>
                  <Ionicons name="color-palette-outline" size={20} color={c.text} />
                  <Text style={{ fontSize: 15, color: c.text }}>Themes</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 13, color: c.subtext }}>{currentThemeName}</Text>
                  <Ionicons name="chevron-forward" size={16} color={c.subtext} />
                </View>
              </Pressable>

              <View style={rowStyle}>
                <View style={rowLeftStyle}>
                  <Ionicons name="map-outline" size={20} color={c.text} />
                  <Text style={{ fontSize: 15, color: c.text }}>Map</Text>
                </View>
                <View
                  style={{
                    flexDirection: 'row',
                    backgroundColor: c.tagBg,
                    borderRadius: 8,
                    padding: 2,
                  }}>
                  {(['apple', 'google'] as const).map((opt) => (
                    <Pressable
                      key={opt}
                      onPress={() => setMapProvider(opt)}
                      style={{
                        paddingVertical: 5,
                        paddingHorizontal: 12,
                        borderRadius: 6,
                        backgroundColor: mapProvider === opt ? c.accent : 'transparent',
                      }}>
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: '600',
                          color: mapProvider === opt ? '#fff' : c.subtext,
                        }}>
                        {opt === 'apple' ? 'Apple' : 'Google'}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* ── PRIVACY & ACCOUNT ── */}
              <SectionLabel label="PRIVACY & ACCOUNT" />
              {!session ? (
                <Pressable
                  onPress={() =>
                    showAlert(
                      'Sign in required',
                      'Create a free account to manage privacy and account settings.',
                      [{ text: 'OK' }]
                    )
                  }
                  style={{ opacity: 0.5 }}>
                  <View style={rowStyle}>
                    <View style={rowLeftStyle}>
                      <Ionicons name="location-outline" size={20} color={c.text} />
                      <Text style={{ fontSize: 15, color: c.text }}>Public Check-ins</Text>
                    </View>
                    <Switch value={false} disabled />
                  </View>
                  <View style={rowStyle}>
                    <View style={rowLeftStyle}>
                      <Ionicons name="lock-closed-outline" size={20} color={c.text} />
                      <Text style={{ fontSize: 15, color: c.text }}>Reset Password</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={c.subtext} />
                  </View>
                  <View style={{ ...rowStyle, borderBottomWidth: 0 }}>
                    <View style={rowLeftStyle}>
                      <Ionicons name="trash-outline" size={20} color={c.danger} />
                      <Text style={{ fontSize: 15, color: c.danger }}>Delete Account</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={c.danger} />
                  </View>
                </Pressable>
              ) : (
                <>
                  <View style={rowStyle}>
                    <View style={rowLeftStyle}>
                      <Ionicons name="location-outline" size={20} color={c.text} />
                      <Text style={{ fontSize: 15, color: c.text }}>Public Check-ins</Text>
                    </View>
                    <Switch
                      value={publicCheckIns}
                      onValueChange={async (v) => {
                        setPublicCheckIns(v);
                        const {
                          data: { user },
                        } = await supabase.auth.getUser();
                        if (user)
                          await supabase
                            .from('profiles')
                            .update({ public_check_ins: v })
                            .eq('id', user.id);
                      }}
                    />
                  </View>
                  <Pressable onPress={handleResetPassword} style={rowStyle}>
                    <View style={rowLeftStyle}>
                      <Ionicons name="lock-closed-outline" size={20} color={c.text} />
                      <Text style={{ fontSize: 15, color: c.text }}>Reset Password</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={c.subtext} />
                  </Pressable>
                  <Pressable
                    onPress={handleDeleteAccount}
                    style={{ ...rowStyle, borderBottomWidth: 0 }}>
                    <View style={rowLeftStyle}>
                      <Ionicons name="trash-outline" size={20} color={c.danger} />
                      <Text style={{ fontSize: 15, color: c.danger }}>Delete Account</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={c.danger} />
                  </Pressable>
                </>
              )}

              {/* ── INFO ── */}
              <SectionLabel label="INFO" />
              <Pressable
                onPress={() => setNotifSectionOpen((p) => !p)}
                style={{ ...rowStyle, borderBottomWidth: notifSectionOpen ? 0 : 1 }}>
                <View style={rowLeftStyle}>
                  <Ionicons name="notifications-outline" size={20} color={c.text} />
                  <Text style={{ flex: 1, fontSize: 15, color: c.text }}>Notifications</Text>
                </View>
                <Ionicons
                  name={notifSectionOpen ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={c.subtext}
                />
              </Pressable>
              {notifSectionOpen ? (
                <View
                  style={{
                    paddingLeft: 30,
                    paddingBottom: 8,
                    borderBottomWidth: 1,
                    borderColor: c.border,
                  }}>
                  {(
                    [
                      ['notify_review', 'Reviews'],
                      ['notify_favorite', 'Saves'],
                      ['notify_wishlist', 'Wishlists'],
                      ['notify_condition', 'Conditions'],
                      ['notify_friend_request', 'Friend Requests'],
                      ['notify_friend_accepted', 'Friend Accepted'],
                      ['notify_event_invite', 'Event Invites'],
                      ['notify_event_reminder', 'Event Reminders'],
                    ] as [keyof NotificationPrefs, string][]
                  ).map(([key, label]) => (
                    <View
                      key={key}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingVertical: 8,
                      }}>
                      <Text style={{ fontSize: 14, color: c.text }}>{label}</Text>
                      <Switch value={prefs[key]} onValueChange={(v) => updatePref(key, v)} />
                    </View>
                  ))}
                </View>
              ) : null}
              <Pressable
                onPress={() => {
                  onClose();
                  onShowOnboarding();
                }}
                style={rowStyle}>
                <View style={rowLeftStyle}>
                  <Ionicons name="information-circle-outline" size={20} color={c.text} />
                  <Text style={{ fontSize: 15, color: c.text }}>How to Use</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={c.subtext} />
              </Pressable>
              <Pressable onPress={() => setFeedbackOpen(true)} style={rowStyle}>
                <View style={rowLeftStyle}>
                  <Ionicons name="chatbubbles-outline" size={20} color={c.text} />
                  <Text style={{ fontSize: 15, color: c.text }}>Feedback</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={c.subtext} />
              </Pressable>
              <Pressable
                onPress={() => setChangelogOpen(true)}
                style={{ ...rowStyle, borderBottomWidth: 0 }}>
                <View style={rowLeftStyle}>
                  <Ionicons name="sparkles-outline" size={20} color={c.text} />
                  <Text style={{ fontSize: 15, color: c.text }}>{"What's New"}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={c.subtext} />
              </Pressable>

              <Text
                style={{
                  textAlign: 'center',
                  fontSize: 12,
                  color: c.subtext,
                  marginTop: 24,
                }}>
                v{Application.nativeApplicationVersion} ({Application.nativeBuildVersion})
              </Text>

              <View style={{ height: 32 }} />
            </ScrollView>
            </ThemeBackdrop>
            <ThemePickerModal visible={themePickerOpen} onClose={() => setThemePickerOpen(false)} />
            {/* Changelog modal */}
            <Modal
              visible={changelogOpen}
              transparent
              animationType="slide"
              onRequestClose={() => setChangelogOpen(false)}>
              <Pressable
                style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }}
                onPress={() => setChangelogOpen(false)}
              />
              <View
                style={{
                  backgroundColor: c.surface,
                  borderTopLeftRadius: 16,
                  borderTopRightRadius: 16,
                  padding: 20,
                  maxHeight: '70%',
                }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: c.text, marginBottom: 4 }}>
                  {"What's New"}
                </Text>
                <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 12 }}>
                  {changelog.map((release) => (
                    <View key={release.version} style={{ marginBottom: 20 }}>
                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: 8,
                        }}>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: c.text }}>
                          Version {release.version}
                        </Text>
                        <Text style={{ fontSize: 12, color: c.subtext }}>{release.date}</Text>
                      </View>
                      {release.changes.map((change, i) => (
                        <View key={i} style={{ flexDirection: 'row', gap: 8, marginBottom: 6 }}>
                          <Text style={{ color: c.accent, fontSize: 13 }}>•</Text>
                          <Text style={{ color: c.text, fontSize: 13, flex: 1 }}>
                            {change}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ))}
                </ScrollView>
                <Pressable
                  onPress={() => setChangelogOpen(false)}
                  style={{
                    marginTop: 16,
                    padding: 13,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: c.border,
                    alignItems: 'center',
                  }}>
                  <Text style={{ color: c.text, fontWeight: '600' }}>Close</Text>
                </Pressable>
              </View>
            </Modal>
            <FeedbackBoardModal
              visible={feedbackOpen}
              onClose={() => setFeedbackOpen(false)}
              session={session}
              initialPostId={initialFeedbackPostId}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
