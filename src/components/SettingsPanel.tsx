import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    Modal,
    Pressable,
    Switch,
    Alert,
    ScrollView,
    Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/src/libs/supabase';
import { useTheme } from '@/src/context/ThemeContext';
import { changelog } from '@/src/changelog';
import {
    useNotificationPreferences,
    NotificationPrefs,
} from '@/src/hooks/useNotificationPreferences';

import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { decode } from 'base64-arraybuffer';

type Props = {
    visible: boolean;
    onClose: () => void;
    onSignOut: () => void;
    onShowOnboarding: () => void;
};

export function SettingsPanel({
    visible,
    onClose,
    onSignOut,
    onShowOnboarding,
}: Props) {
    const insets = useSafeAreaInsets();
    const [resetSent, setResetSent] = useState(false);
    const [changelogOpen, setChangelogOpen] = useState(false);
    const { theme, darkMode, toggleDarkMode } = useTheme();
    const c = theme.colors;

    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [avatarLoading, setAvatarLoading] = useState(false);
    const [username, setUsername] = useState<string | null>(null);

    const { prefs, loadPrefs, updatePref } = useNotificationPreferences();
    const [notifSectionOpen, setNotifSectionOpen] = useState(false);

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
                .select('avatar_url, username')
                .eq('id', user.id)
                .single();
            setAvatarUrl(data?.avatar_url ?? null);
            setUsername(data?.username ?? null);
        }
        if (visible) loadAvatar();
    }, [visible]);

    async function handleResetPassword() {
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user?.email) return;

        const { error } = await supabase.auth.resetPasswordForEmail(
            user.email,
            {
                redirectTo: 'skatespotapp:///reset-password',
            }
        );
        if (error) {
            Alert.alert('Error', error.message);
        } else {
            setResetSent(true);
            Alert.alert(
                'Email sent',
                'Check your inbox for a password reset link.'
            );
        }
    }

    async function handleAvatarUpload() {
        const { status } =
            await ImagePicker.requestMediaLibraryPermissionsAsync();
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

        const compressed = await manipulateAsync(
            result.assets[0].uri,
            [{ resize: { width: 300 } }],
            { compress: 0.8, format: SaveFormat.JPEG, base64: true }
        );
        if (!compressed.base64) {
            setAvatarLoading(false);
            return;
        }

        const filename = `${user.id}.jpg`;
        await supabase.storage
            .from('avatars')
            .upload(filename, decode(compressed.base64), {
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
            console.log('upload error:', uploadError);
            setAvatarLoading(false);
            return;
        }

        const { data: urlData } = supabase.storage
            .from('avatars')
            .getPublicUrl(filename);
        const freshUrl = `${urlData.publicUrl}?t=${Date.now()}`;

        const { data: moderationResult } = await supabase.functions.invoke(
            'moderate-image',
            {
                body: {
                    image_url: freshUrl,
                    spot_id: null,
                    user_id: user.id,
                },
            }
        );

        if (moderationResult?.safe === false) {
            await supabase.storage.from('avatars').remove([filename]);
            Alert.alert(
                'Image Rejected',
                'Your profile photo was flagged as inappropriate. Please choose a different image.'
            );
            setAvatarLoading(false);
            return;
        }

        await supabase
            .from('profiles')
            .update({ avatar_url: freshUrl })
            .eq('id', user.id);
        setAvatarUrl(null);
        setAvatarUrl(freshUrl);
        setAvatarLoading(false);
    }

    function handleDeleteAccount() {
        Alert.alert(
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
                            Alert.alert('Error', error.message);
                        } else {
                            await supabase.auth.signOut();
                            onSignOut();
                        }
                    },
                },
            ]
        );
    }

    return (
        <>
            <Modal
                visible={visible}
                transparent
                animationType="fade"
                onRequestClose={onClose}
            >
                <Pressable
                    style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }}
                    onPress={onClose}
                >
                    <Pressable
                        style={{
                            position: 'absolute',
                            right: 0,
                            paddingTop: insets.top,
                            width: 280,
                            height: '100%',
                            backgroundColor: c.panelBg,
                            padding: 16,
                            flexDirection: 'column',
                        }}
                        onPress={() => {}}
                    >
                        <View
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                marginBottom: 24,
                            }}
                        >
                            <Ionicons
                                name="settings-outline"
                                size={20}
                                color={c.text}
                                style={{ marginRight: 8 }}
                            />
                            <Text
                                style={{
                                    fontSize: 18,
                                    fontWeight: '600',
                                    color: c.text,
                                }}
                            >
                                Settings
                            </Text>
                        </View>

                        <View
                            style={{ alignItems: 'center', marginBottom: 24 }}
                        >
                            <Pressable onPress={handleAvatarUpload}>
                                {avatarUrl ? (
                                    <Image
                                        source={{ uri: avatarUrl }}
                                        style={{
                                            width: 72,
                                            height: 72,
                                            borderRadius: 36,
                                            marginBottom: 8,
                                        }}
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
                                        }}
                                    >
                                        <Ionicons
                                            name="person-outline"
                                            size={32}
                                            color={c.subtext}
                                        />
                                    </View>
                                )}
                            </Pressable>
                            {username ? (
                                <Text
                                    style={{
                                        fontSize: 14,
                                        fontWeight: '600',
                                        color: c.text,
                                        marginBottom: 4,
                                    }}
                                >
                                    @{username}
                                </Text>
                            ) : null}
                            <Pressable onPress={handleAvatarUpload}>
                                <Text
                                    style={{ fontSize: 13, color: '#007AFF' }}
                                >
                                    {avatarLoading
                                        ? 'Uploading...'
                                        : 'Change Photo'}
                                </Text>
                            </Pressable>
                        </View>

                        <View
                            style={{
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                paddingVertical: 14,
                                borderBottomWidth: 1,
                                borderColor: c.border,
                            }}
                        >
                            <View
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 10,
                                }}
                            >
                                <Ionicons
                                    name="moon-outline"
                                    size={20}
                                    color={c.text}
                                />
                                <Text style={{ fontSize: 15, color: c.text }}>
                                    Dark Mode
                                </Text>
                            </View>
                            <Switch
                                value={darkMode}
                                onValueChange={toggleDarkMode}
                            />
                        </View>

                        <Pressable
                            onPress={handleResetPassword}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 10,
                                paddingVertical: 14,
                                borderBottomWidth: 1,
                                borderColor: c.border,
                            }}
                        >
                            <Ionicons
                                name="lock-closed-outline"
                                size={20}
                                color={c.text}
                            />
                            <Text style={{ fontSize: 15, color: c.text }}>
                                Reset Password
                            </Text>
                        </Pressable>

                        <Pressable
                            onPress={() => setNotifSectionOpen((p) => !p)}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 10,
                                paddingVertical: 14,
                                borderBottomWidth: notifSectionOpen ? 0 : 1,
                                borderColor: c.border,
                            }}
                        >
                            <Ionicons
                                name="notifications-outline"
                                size={20}
                                color={c.text}
                            />
                            <Text
                                style={{
                                    flex: 1,
                                    fontSize: 15,
                                    color: c.text,
                                }}
                            >
                                Notifications
                            </Text>
                            <Ionicons
                                name={
                                    notifSectionOpen
                                        ? 'chevron-up'
                                        : 'chevron-down'
                                }
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
                                }}
                            >
                                {(
                                    [
                                        ['notify_review', 'Reviews'],
                                        ['notify_favorite', 'Saves'],
                                        ['notify_wishlist', 'Wishlists'],
                                        ['notify_condition', 'Conditions'],
                                        [
                                            'notify_friend_request',
                                            'Friend Requests',
                                        ],
                                        [
                                            'notify_friend_accepted',
                                            'Friend Accepted',
                                        ],
                                    ] as [keyof NotificationPrefs, string][]
                                ).map(([key, label]) => (
                                    <View
                                        key={key}
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            paddingVertical: 8,
                                        }}
                                    >
                                        <Text
                                            style={{
                                                fontSize: 14,
                                                color: c.text,
                                            }}
                                        >
                                            {label}
                                        </Text>
                                        <Switch
                                            value={prefs[key]}
                                            onValueChange={(v) =>
                                                updatePref(key, v)
                                            }
                                        />
                                    </View>
                                ))}
                            </View>
                        ) : null}

                        <Pressable
                            onPress={() => {
                                onClose();
                                onShowOnboarding();
                            }}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 10,
                                paddingVertical: 14,
                                borderBottomWidth: 1,
                                borderColor: c.border,
                            }}
                        >
                            <Ionicons
                                name="information-circle-outline"
                                size={20}
                                color={c.text}
                            />
                            <Text style={{ fontSize: 15, color: c.text }}>
                                How to Use
                            </Text>
                        </Pressable>

                        <Pressable
                            onPress={() => setChangelogOpen(true)}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 10,
                                paddingVertical: 14,
                                borderBottomWidth: 1,
                                borderColor: c.border,
                            }}
                        >
                            <Ionicons
                                name="sparkles-outline"
                                size={20}
                                color={c.text}
                            />
                            <Text style={{ fontSize: 15, color: c.text }}>
                                {"What's New"}
                            </Text>
                        </Pressable>

                        <View style={{ flex: 1 }} />

                        <Pressable
                            onPress={handleDeleteAccount}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 10,
                                paddingVertical: 14,
                                borderTopWidth: 1,
                                borderColor: c.border,
                            }}
                        >
                            <Ionicons
                                name="trash-outline"
                                size={20}
                                color={c.danger}
                            />
                            <Text style={{ fontSize: 15, color: c.danger }}>
                                Delete Account
                            </Text>
                        </Pressable>

                        <Modal
                            visible={changelogOpen}
                            transparent
                            animationType="slide"
                            onRequestClose={() => setChangelogOpen(false)}
                        >
                            <Pressable
                                style={{
                                    flex: 1,
                                    backgroundColor: 'rgba(0,0,0,0.3)',
                                }}
                                onPress={() => setChangelogOpen(false)}
                            />
                            <View
                                style={{
                                    backgroundColor: c.surface,
                                    borderTopLeftRadius: 16,
                                    borderTopRightRadius: 16,
                                    padding: 20,
                                    maxHeight: '70%',
                                }}
                            >
                                <Text
                                    style={{
                                        fontSize: 18,
                                        fontWeight: '700',
                                        color: c.text,
                                        marginBottom: 4,
                                    }}
                                >
                                    {"What's New"}
                                </Text>
                                <ScrollView
                                    showsVerticalScrollIndicator={false}
                                    style={{ marginTop: 12 }}
                                >
                                    {changelog.map((release) => (
                                        <View
                                            key={release.version}
                                            style={{ marginBottom: 20 }}
                                        >
                                            <View
                                                style={{
                                                    flexDirection: 'row',
                                                    justifyContent:
                                                        'space-between',
                                                    alignItems: 'center',
                                                    marginBottom: 8,
                                                }}
                                            >
                                                <Text
                                                    style={{
                                                        fontSize: 15,
                                                        fontWeight: '700',
                                                        color: c.text,
                                                    }}
                                                >
                                                    Version {release.version}
                                                </Text>
                                                <Text
                                                    style={{
                                                        fontSize: 12,
                                                        color: c.subtext,
                                                    }}
                                                >
                                                    {release.date}
                                                </Text>
                                            </View>
                                            {release.changes.map(
                                                (change, i) => (
                                                    <View
                                                        key={i}
                                                        style={{
                                                            flexDirection:
                                                                'row',
                                                            gap: 8,
                                                            marginBottom: 6,
                                                        }}
                                                    >
                                                        <Text
                                                            style={{
                                                                color: '#007AFF',
                                                                fontSize: 13,
                                                            }}
                                                        >
                                                            •
                                                        </Text>
                                                        <Text
                                                            style={{
                                                                color: c.text,
                                                                fontSize: 13,
                                                                flex: 1,
                                                            }}
                                                        >
                                                            {change}
                                                        </Text>
                                                    </View>
                                                )
                                            )}
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
                                    }}
                                >
                                    <Text
                                        style={{
                                            color: c.text,
                                            fontWeight: '600',
                                        }}
                                    >
                                        Close
                                    </Text>
                                </Pressable>
                            </View>
                        </Modal>
                    </Pressable>
                </Pressable>
            </Modal>
        </>
    );
}
