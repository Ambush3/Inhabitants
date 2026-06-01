import React, { useState } from 'react';
import {
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
  View,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/src/hooks/useAuth';
import { useInvite } from '@/src/hooks/useInvite';
import { router } from 'expo-router';
import { useTheme } from '@/src/context/ThemeContext';
import LottieView from 'lottie-react-native';

export default function AuthScreen() {
  const { signIn, signUp, resetPassword } = useAuth();
  const { theme } = useTheme();
  const c = theme.colors;

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const { inviterId, clearReferral } = useInvite();

  async function handleSubmit() {
    Keyboard.dismiss();
    setError(null);
    setSuccess(null);

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setError('Email and password are required.');
      return;
    }

    if (!isLogin && !username.trim()) {
      setError('Username is required.');
      return;
    }

    setLoading(true);

    const err = isLogin
      ? await signIn(trimmedEmail, trimmedPassword)
      : await signUp(
        trimmedEmail,
        trimmedPassword,
        username.trim().toLowerCase(),
        firstName.trim() || undefined,
        lastName.trim() || undefined,
        inviterId
      );

    setLoading(false);

    if (err) {
      setError(err);
      return;
    }

    if (!isLogin) {
      if (inviterId) await clearReferral();
      setSuccess('Account created! Please check your email to confirm your account.');
      return;
    }
    router.replace('/');
  }

  async function handleResetPassword() {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setError('Enter your email address first.');
      return;
    }
    setLoading(true);
    const err = await resetPassword(trimmedEmail);
    setLoading(false);
    if (err) {
      setError(err);
      return;
    }
    setSuccess('Password reset email sent. Check your inbox.');
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={0}>
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'flex-start',
            padding: 24,
          }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag">
          <View style={styles.animationContainer}>
            <LottieView
              source={require('../assets/animations/skate-boy.json')}
              autoPlay
              loop
              style={styles.loginAnimation}
            />
          </View>

          <Text
            style={{
              fontSize: 28,
              fontWeight: '700',
              marginBottom: 8,
              color: c.text,
            }}>
            {isLogin ? 'Welcome back' : 'Create account'}
          </Text>

          <Text
            style={{
              opacity: 0.5,
              marginBottom: 32,
              color: c.text,
            }}>
            {isLogin ? 'Sign in to your account' : 'Sign up to start adding spots'}
          </Text>

          {error ? <Text style={{ color: c.danger, marginBottom: 16 }}>{error}</Text> : null}

          {success ? <Text style={{ color: 'green', marginBottom: 16 }}>{success}</Text> : null}

          <Text
            style={{
              marginBottom: 6,
              fontWeight: '500',
              color: c.text,
            }}>
            Email
          </Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={c.placeholder}
            autoCapitalize="none"
            keyboardType="email-address"
            textContentType="emailAddress"
            autoComplete="email"
            style={{
              borderWidth: 1,
              borderColor: c.inputBorder,
              borderRadius: 8,
              padding: 12,
              marginBottom: 16,
              color: c.text,
              backgroundColor: c.surface,
            }}
          />

          <Text
            style={{
              marginBottom: 6,
              fontWeight: '500',
              color: c.text,
            }}>
            Password
          </Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor={c.placeholder}
            secureTextEntry
            textContentType={isLogin ? 'password' : 'newPassword'}
            autoComplete={isLogin ? 'password' : 'new-password'}
            style={{
              borderWidth: 1,
              borderColor: c.inputBorder,
              borderRadius: 8,
              padding: 12,
              marginBottom: 16,
              color: c.text,
              backgroundColor: c.surface,
            }}
          />

          {!isLogin ? (
            <>
              <Text
                style={{
                  marginBottom: 6,
                  fontWeight: '500',
                  color: c.text,
                }}>
                Confirm Password
              </Text>
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="••••••••"
                placeholderTextColor={c.placeholder}
                secureTextEntry
                textContentType="newPassword"
                autoComplete="new-password"
                style={{
                  borderWidth: 1,
                  borderColor: c.inputBorder,
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 16,
                  color: c.text,
                  backgroundColor: c.surface,
                }}
              />
              <Text
                style={{
                  marginBottom: 6,
                  fontWeight: '500',
                  color: c.text,
                }}>
                Username
              </Text>
              <TextInput
                value={username}
                onChangeText={setUsername}
                placeholder="e.g. skate123"
                placeholderTextColor={c.placeholder}
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="username"
                autoComplete="username-new"
                style={{
                  borderWidth: 1,
                  borderColor: c.inputBorder,
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 16,
                  color: c.text,
                  backgroundColor: c.surface,
                }}
              />
              <Text
                style={{
                  marginBottom: 6,
                  fontWeight: '500',
                  color: c.text,
                }}>
                First Name <Text style={{ opacity: 0.5, fontWeight: '400' }}>(optional)</Text>
              </Text>
              <TextInput
                value={firstName}
                onChangeText={setFirstName}
                placeholder="First name"
                placeholderTextColor={c.placeholder}
                autoCapitalize="words"
                textContentType="givenName"
                autoComplete="given-name"
                style={{
                  borderWidth: 1,
                  borderColor: c.inputBorder,
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 16,
                  color: c.text,
                  backgroundColor: c.surface,
                }}
              />
              <Text
                style={{
                  marginBottom: 6,
                  fontWeight: '500',
                  color: c.text,
                }}>
                Last Name <Text style={{ opacity: 0.5, fontWeight: '400' }}>(optional)</Text>
              </Text>
              <TextInput
                value={lastName}
                onChangeText={setLastName}
                placeholder="Last name"
                placeholderTextColor={c.placeholder}
                autoCapitalize="words"
                textContentType="familyName"
                autoComplete="family-name"
                style={{
                  borderWidth: 1,
                  borderColor: c.inputBorder,
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 16,
                  color: c.text,
                  backgroundColor: c.surface,
                }}
              />
            </>
          ) : null}

          <Pressable
            onPress={handleSubmit}
            disabled={loading}
            style={{
              backgroundColor: c.buttonBg,
              borderRadius: 8,
              padding: 14,
              alignItems: 'center',
              marginBottom: 16,
              opacity: loading ? 0.6 : 1,
            }}>
            <Text
              style={{
                color: c.background,
                fontWeight: '600',
                fontSize: 16,
              }}>
              {loading ? 'Please wait...' : isLogin ? 'Sign in' : 'Create account'}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              setIsLogin((prev) => !prev);
              setError(null);
              setSuccess(null);
              setUsername('');
            }}>
            <Text
              style={{
                textAlign: 'center',
                opacity: 0.6,
                color: c.text,
              }}>
              {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </Text>
          </Pressable>

          {isLogin ? (
            <Pressable onPress={handleResetPassword} style={{ marginTop: 12 }}>
              <Text
                style={{
                  textAlign: 'center',
                  opacity: 0.4,
                  color: c.text,
                }}>
                Forgot password?
              </Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  animationContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  loginAnimation: {
    width: 140,
    height: 140,
  },
});
