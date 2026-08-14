import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.vrohitdev.mediavoyage",
  appName: "Media Voyage",
  webDir: "dist",
  server: {
    url: "https://mediavoyage.online/",
    hostname: "app.mediavoyage.local",
    androidScheme: "https",
  },
};

export default config;
