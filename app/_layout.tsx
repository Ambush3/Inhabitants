import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect } from "react";
import { Linking } from "react-native";
import { Stack, router, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useAuth } from "@/src/hooks/useAuth";
import { ThemeProvider, useTheme } from "@/src/context/ThemeContext";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { supabase } from "@/src/libs/supabase";

function RootLayoutInner() {
  const { session, loading } = useAuth();
  const { darkMode, theme } = useTheme();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (session) {
      if (pathname === "/reset-password") return;
      AsyncStorage.getItem("pendingDeepLink").then(async (deepLink) => {
        if (deepLink) {
          AsyncStorage.removeItem("pendingDeepLink");
          const { id, lat, lng } = JSON.parse(deepLink);
          router.replace({
            pathname: "/",
            params: {
              deepLinkSpotId: id,
              deepLinkLat: lat,
              deepLinkLng: lng,
            },
          });
          return;
        }

        const hasSeen = await AsyncStorage.getItem("hasSeenOnboarding");
        if (!hasSeen) {
          router.replace("/onboarding");
        } else {
          router.replace("/");
        }
      });
    } else {
      if (pathname === "/reset-password") return;
      Linking.getInitialURL().then((url) => {
        if (url && url.includes("access_token")) return;
        router.replace("/auth");
      });
    }
  }, [session, loading, pathname]);

  useEffect(() => {
    async function handleDeepLink(url: string) {
      if (url.includes("type=recovery") || url.includes("access_token")) {
        const params = new URLSearchParams(url.split("#")[1]);
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");
        const type = params.get("type");
        if (accessToken && refreshToken && type === "recovery") {
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          router.replace("/reset-password");
        }
      }
    }

    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });

    const sub = Linking.addEventListener("url", ({ url }) => {
      handleDeepLink(url);
    });
    return () => sub.remove();
  }, []);

  return (
    <>
      <StatusBar style={darkMode ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <RootLayoutInner />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
