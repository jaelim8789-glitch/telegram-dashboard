import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.telemon.app',
  appName: 'TeleMon',
  webDir: 'dist',
  server: {
    url: process.env.CAP_SERVER_URL || undefined,
    cleartext: true,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    SplashScreen: {
      launchShowDuration: 1000,
      backgroundColor: '#0a0a0a',
    },
    Badge: {
      persist: true,
    },
  },
};

export default config;
