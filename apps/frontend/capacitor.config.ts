import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.vrohitdev.mediavoyage",
  appName: "Media Voyage",
  webDir: "dist",
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
  server: {
    url: "https://mediavoyage.online/",
    hostname: "app.mediavoyage.local",
    androidScheme: "https",
  },
};

export default config;
