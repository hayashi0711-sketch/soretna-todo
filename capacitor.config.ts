import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.yourname.soretnatodo',
  appName: 'それな！Todo',
  webDir: 'dist',
  server: { androidScheme: 'https' },
  plugins: {
    StatusBar: { style: 'dark', backgroundColor: '#0f0f13' },
    Keyboard:  { resize: 'body', style: 'dark' },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#7c6af7',
    },
  },
};

export default config;
