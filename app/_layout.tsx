import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useRouter } from "expo-router";
import React, { createContext, useContext, useMemo, useState } from "react";

type AuthContextValue = {
  isLoggedIn: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const useAuth = () => {
  const v = useContext(AuthContext);
  if (!v) throw new Error("useAuth must be used within AuthContext.Provider");
  return v;
};

export default function RootLayout() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const value = useMemo<AuthContextValue>(
    () => ({
      isLoggedIn,
      login: async () => {
        setIsLoggedIn(true);
        await AsyncStorage.setItem("isLoggedIn", "true");
        router.replace("/(tabs)");
      },
      logout: async () => {
        setIsLoggedIn(false);
        await AsyncStorage.removeItem("isLoggedIn");
        router.replace("/(auth)/login");
      },
    }),
    [isLoggedIn, router]
  );

  return (
    <AuthContext.Provider value={value}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="settings" />
      </Stack>
    </AuthContext.Provider>
  );
}
