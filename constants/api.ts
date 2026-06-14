import Constants from "expo-constants";
import { Platform } from "react-native";

const LOCAL_API_BASE_URL =
  Platform.OS === "android" ? "http://10.0.2.2:8080" : "http://localhost:8080";

const expoConfig =
  (Constants.expoConfig ?? Constants.manifest) as
    | { extra?: { apiBaseUrl?: string } }
    | undefined;

const EXPO_API_BASE_URL =
  expoConfig?.extra?.apiBaseUrl ?? process.env.EXPO_PUBLIC_API_BASE_URL;

export const API_BASE_URL = EXPO_API_BASE_URL ?? LOCAL_API_BASE_URL;

export const isUsingLocalApiBaseUrl = () =>
  API_BASE_URL.includes("localhost") || API_BASE_URL.includes("127.0.0.1") ||
  API_BASE_URL.includes("10.0.2.2");
