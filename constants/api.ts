const LOCAL_API_BASE_URL = "http://localhost:8080";

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? LOCAL_API_BASE_URL;

export const isUsingLocalApiBaseUrl = () =>
  API_BASE_URL.includes("localhost") || API_BASE_URL.includes("127.0.0.1");
