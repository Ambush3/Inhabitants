import React, { useState } from 'react';
import { View, Text, Modal, Pressable, Switch, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/src/libs/supabase';
import { useTheme } from '@/src/context/ThemeContext';

type Props = {
    visible: boolean;
    onClose: () => void;
    onSignOut: () => void;
};

export function SettingsPanel({ visible, onClose, onSignOut }: Props) {
    const insets = useSafeAreaInsets();
    const [resetSent, setResetSent] = useState(false);
    const { theme, darkMode, toggleDarkMode } = useTheme();
    const c = theme.colors;

    async function handleResetPassword() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.email) return;

        const { error } = await supabase.auth.resetPasswordForEmail(user.email);
        if (error) {
            Alert.alert('Error', error.message);
        } else {
            setResetSent(true);
            Alert.alert('Email sent', 'Check your inbox for a password reset link.');
        }
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
                    }
                }
            ]
        );
    }

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }} onPress={onClose}>
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
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
                        <Ionicons name="settings-outline" size={20} color={c.text} style={{ marginRight: 8 }} />
                        <Text style={{ fontSize: 18, fontWeight: '600', color: c.text }}>Settings</Text>
                    </View>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderColor: c.border }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <Ionicons name="moon-outline" size={20} color={c.text} />
                            <Text style={{ fontSize: 15, color: c.text }}>Dark Mode</Text>
                        </View>
                        <Switch value={darkMode} onValueChange={toggleDarkMode} />
                    </View>

                    <Pressable
                        onPress={handleResetPassword}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, borderBottomWidth: 1, borderColor: c.border }}
                    >
                        <Ionicons name="lock-closed-outline" size={20} color={c.text} />
                        <Text style={{ fontSize: 15, color: c.text }}>Reset Password</Text>
                    </Pressable>

                    <View style={{ flex: 1 }} />

                    <Pressable
                        onPress={handleDeleteAccount}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, borderTopWidth: 1, borderColor: c.border }}
                    >
                        <Ionicons name="trash-outline" size={20} color={c.danger} />
                        <Text style={{ fontSize: 15, color: c.danger }}>Delete Account</Text>
                    </Pressable>
                </Pressable>
            </Pressable>
        </Modal>
    );
}