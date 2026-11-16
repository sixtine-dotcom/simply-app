import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'be.simplyapp.app',
  appName: 'Simply App',
  webDir: 'mobile-web',
  appendUserAgent: 'SimplyAppNative/1.0',
  server: {
    url: 'https://simplyapp.be',
    cleartext: false,
    errorPath: 'offline.html'
  }
};

export default config;
