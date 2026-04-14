import React, { useState } from "react";
import {
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/src/hooks/useAuth";
import { router } from "expo-router";
import { useTheme } from "@/src/context/ThemeContext";

export default function ResetPasswordScreen() {
  const { updatePassword } = useAuth();
  const { theme } = useTheme();
  const c = theme.colors;

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleReset() {
    setError(null);
    if (!password.trim()) {
      setError("Password is required.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    const err = await updatePassword(password.trim());
    setLoading(false);

    if (err) {
      console.log("err value:", JSON.stringify(err));
      if (err.toLowerCase().includes("session")) {
        Alert.alert(
          "Link Expired",
          "Your reset link has expired. Please request a new one.",
          [{ text: "OK", onPress: () => router.replace("/auth") }],
        );
        return;
      }
      setError(err);
      return;
    }
    Alert.alert("Success", "Your password has been updated.", [
      { text: "OK", onPress: () => router.replace("/") },
    ]);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, padding: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text
            style={{
              fontSize: 24,
              fontWeight: "700",
              marginBottom: 8,
              color: c.text,
            }}
          >
            New Password
          </Text>
          <Text style={{ opacity: 0.5, marginBottom: 32, color: c.text }}>
            Enter your new password below.
          </Text>

          {error ? (
            <Text style={{ color: c.danger, marginBottom: 16 }}>{error}</Text>
          ) : null}

          <Text style={{ marginBottom: 6, fontWeight: "500", color: c.text }}>
            New Password
          </Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
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

          <Text style={{ marginBottom: 6, fontWeight: "500", color: c.text }}>
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

          <Pressable
            onPress={handleReset}
            disabled={loading}
            style={{
              backgroundColor: c.buttonBg,
              borderRadius: 8,
              padding: 14,
              alignItems: "center",
              opacity: loading ? 0.6 : 1,
            }}
          >
            <Text
              style={{ color: c.background, fontWeight: "600", fontSize: 16 }}
            >
              {loading ? "Updating..." : "Update Password"}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
