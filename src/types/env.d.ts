declare namespace NodeJS {
  interface ProcessEnv {
    EXPO_PUBLIC_API_BASE_URL?: string;
    EXPO_PUBLIC_ENABLE_LOCAL_DEV_AUTH?: string;
    EXPO_PUBLIC_LOCAL_LOGIN_PIN?: string;
    EXPO_PUBLIC_SUPABASE_ANON_KEY?: string;
    EXPO_PUBLIC_SUPABASE_URL?: string;
  }
}
