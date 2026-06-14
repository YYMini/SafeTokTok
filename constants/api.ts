import Constants from "expo-constants";

const DEFAULT_API_BASE_URL = "https://safetoktok-production.up.railway.app";

const expoConfig =
  (Constants.expoConfig ?? Constants.manifest) as
    | { extra?: { apiBaseUrl?: string } }
    | undefined;

const EXPO_API_BASE_URL =
  expoConfig?.extra?.apiBaseUrl ?? process.env.EXPO_PUBLIC_API_BASE_URL;

export const API_BASE_URL = EXPO_API_BASE_URL ?? DEFAULT_API_BASE_URL;

export const isUsingLocalApiBaseUrl = () =>
  API_BASE_URL.includes("localhost") || API_BASE_URL.includes("127.0.0.1") ||
  API_BASE_URL.includes("10.0.2.2");
