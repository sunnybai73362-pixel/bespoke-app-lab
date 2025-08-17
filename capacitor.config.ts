import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.7e24f1a759244b76905da5285b38e574',
  appName: 'LoftyEyes',
  webDir: 'dist',
  server: {
    url: 'https://7e24f1a7-5924-4b76-905d-a5285b38e574.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
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