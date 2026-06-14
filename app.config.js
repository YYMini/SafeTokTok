import dotenv from "dotenv";

dotenv.config();

export default ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
  },
});
