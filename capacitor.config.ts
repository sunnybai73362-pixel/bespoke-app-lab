import { CapacitorConfig } from '@capacitor/cli';

const isDev = process.env.NODE_ENV !== 'production';

const config: CapacitorConfig = {
  appId: 'com.loftyeyes.app',
  appName: 'LoftyEyes',
  webDir: 'dist',
  server: isDev ? {
    url: 'https://7e24f1a7-5924-4b76-905d-a5285b38e574.lovableproject.com?forceHideBadge=true',
    cleartext: true
  } : undefined,
  plugins: {
    StatusBar: {
      backgroundColor: '#1a1625',
      style: 'LIGHT'
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#1a1625',
      showSpinner: false
    }
  }
};

export default config;
