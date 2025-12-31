import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vpena.onpoint',
  appName: 'VPENA OnPoint',
  webDir: 'dist',
  plugins: {
    Keyboard: {
      resize: 'native',
      style: 'dark',
      resizeOnFullScreen: true,
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#1e293b',
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#1e293b',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
  },
  ios: {
    contentInset: 'automatic',
    scrollEnabled: true,
    allowsLinkPreview: false,
    // Improve touch responsiveness
    webContentsDebuggingEnabled: false,
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
    // Improve scroll performance
    loggingBehavior: 'none',
  },
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
    // Enable for faster loads
    cleartext: false,
  },
};

export default config;
