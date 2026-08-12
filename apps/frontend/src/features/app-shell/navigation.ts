import {
  IconBell,
  IconBooks,
  IconCalendar,
  IconDeviceTv,
  IconSettings,
  IconSparkles,
  IconTags,
  IconTrash,
  IconTrendingUp,
  IconUser,
  IconUsers,
} from "@tabler/icons-react";

export const appNavigationItems = [
  {
    label: "Dashboard",
    description: "Review your library overview",
    icon: IconTrendingUp,
    path: "/dashboard",
    keywords: ["home", "stats", "insights"],
  },
  {
    label: "Library",
    description: "Browse and filter your media",
    icon: IconBooks,
    path: "/media",
    keywords: ["movies", "shows", "games", "books"],
  },
  {
    label: "Recommendations",
    description: "Generate ideas from your library",
    icon: IconSparkles,
    path: "/recommendations",
    keywords: ["discover", "suggestions", "for you"],
  },
  {
    label: "Activity Calendar",
    description: "See your activity history",
    icon: IconCalendar,
    path: "/calendar",
    keywords: ["history", "completed", "started"],
  },
  {
    label: "Collections",
    description: "Open your media collections",
    icon: IconBooks,
    path: "/collection",
    keywords: ["lists", "groups"],
  },
  {
    label: "Friends",
    description: "View friends and shared media",
    icon: IconUsers,
    path: "/friends",
    keywords: ["social", "shared"],
  },
  {
    label: "Notifications",
    description: "Review recent activity",
    icon: IconBell,
    path: "/notifications",
    keywords: ["alerts", "updates"],
  },
  {
    label: "Tag Management",
    description: "Manage your library tags",
    icon: IconTags,
    path: "/tags",
    keywords: ["labels", "organize"],
  },
  {
    label: "Source Management",
    description: "Manage your custom sources",
    icon: IconDeviceTv,
    path: "/sources",
    keywords: ["providers", "services"],
  },
  {
    label: "Trash",
    description: "Restore deleted entries",
    icon: IconTrash,
    path: "/trash",
    keywords: ["deleted", "restore"],
  },
  {
    label: "Profile",
    description: "View your profile",
    icon: IconUser,
    path: "/profile",
    keywords: ["account", "identity"],
  },
  {
    label: "Settings",
    description: "Adjust your account and appearance",
    icon: IconSettings,
    path: "/settings",
    keywords: ["preferences", "theme", "password", "email"],
  },
] as const;

export type AppNavigationPath = (typeof appNavigationItems)[number]["path"];
export type AppShellPath = AppNavigationPath | "/media/add";

export const mobilePrimaryNavigationItems = appNavigationItems.filter(
  (item) =>
    item.path === "/dashboard" ||
    item.path === "/media" ||
    item.path === "/recommendations",
);

export const sidebarNavigationItems = appNavigationItems.filter(
  (item) => item.path !== "/collection",
);
