import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.chocohouse.desserts',
  appName: 'Choco House',
  webDir: 'public',
  server: {
    url: 'https://choco-house.vercel.app',
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#0d0805',
  },
};

export default config;
