import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/src/hooks/useAuth';
import { router } from 'expo-router';

export default function AuthScreen() {
    const { signIn, signUp } = useAuth();

    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);

    async function handleSubmit() {
        setError(null);
        setSuccess(null);

        const trimmedEmail = email.trim().toLowerCase();
        const trimmedPassword = password.trim();

        if (!trimmedEmail || !trimmedPassword) {
            setError('Email and password are required.');
            return;
        }

        if (!isLogin && trimmedPassword !== confirmPassword.trim()) {
            setError('Passwords do not match.');
            return;
        }

        setLoading(true);

        const err = isLogin
            ? await signIn(trimmedEmail, trimmedPassword)
            : await signUp(trimmedEmail, trimmedPassword);

        setLoading(false);

        if (err) {
            setError(err);
            return;
        }

        if (!isLogin) {
            setSuccess('Account created! Please check your email to confirm your account.');
            return;
        }

        router.replace('/');
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
                    keyboardShouldPersistTaps="handled"
                >
                    <Text style={{ fontSize: 28, fontWeight: '700', marginBottom: 8 }}>
                        {isLogin ? 'Welcome back' : 'Create account'}
                    </Text>

                    <Text style={{ opacity: 0.5, marginBottom: 32 }}>
                        {isLogin ? 'Sign in to your account' : 'Sign up to start adding skate spots'}
                    </Text>

                    {error ? (
                        <Text style={{ color: 'red', marginBottom: 16 }}>{error}</Text>
                    ) : null}

                    {success ? (
                        <Text style={{ color: 'green', marginBottom: 16 }}>{success}</Text>
                    ) : null}

                    <Text style={{ marginBottom: 6, fontWeight: '500' }}>Email</Text>
                    <TextInput
                        value={email}
                        onChangeText={setEmail}
                        placeholder="you@example.com"
                        autoCapitalize="none"
                        keyboardType="email-address"
                        style={{
                            borderWidth: 1,
                            borderColor: '#ccc',
                            borderRadius: 8,
                            padding: 12,
                            marginBottom: 16,
                        }}
                    />

                    <Text style={{ marginBottom: 6, fontWeight: '500' }}>Password</Text>
                    <TextInput
                        value={password}
                        onChangeText={setPassword}
                        placeholder="••••••••"
                        secureTextEntry
                        style={{
                            borderWidth: 1,
                            borderColor: '#ccc',
                            borderRadius: 8,
                            padding: 12,
                            marginBottom: 16,
                        }}
                    />

                    {!isLogin ? (
                        <>
                            <Text style={{ marginBottom: 6, fontWeight: '500' }}>Confirm Password</Text>
                            <TextInput
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                placeholder="••••••••"
                                secureTextEntry
                                style={{
                                    borderWidth: 1,
                                    borderColor: '#ccc',
                                    borderRadius: 8,
                                    padding: 12,
                                    marginBottom: 16,
                                }}
                            />
                        </>
                    ) : null}

                    <Pressable
                        onPress={handleSubmit}
                        disabled={loading}
                        style={{
                            backgroundColor: '#000',
                            borderRadius: 8,
                            padding: 14,
                            alignItems: 'center',
                            marginBottom: 16,
                            opacity: loading ? 0.6 : 1,
                        }}
                    >
                        <Text style={{ color: 'white', fontWeight: '600', fontSize: 16 }}>
                            {loading ? 'Please wait...' : isLogin ? 'Sign in' : 'Create account'}
                        </Text>
                    </Pressable>

                    <Pressable onPress={() => {
                        setIsLogin(prev => !prev);
                        setError(null);
                        setSuccess(null);
                    }}>
                        <Text style={{ textAlign: 'center', opacity: 0.6 }}>
                            {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
                        </Text>
                    </Pressable>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}