export type NavItem = {
  label: string;
  href: string;
  cityScoped?: boolean;
  icon?: string;
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Demos", href: "/", cityScoped: true, icon: "🎬" },
  { label: "Topics", href: "/?tab=topic", cityScoped: true, icon: "💡" },
  { label: "Events", href: "/events", cityScoped: true, icon: "📅" },
  { label: "Speakers", href: "/speakers", cityScoped: true, icon: "🎤" },
  { label: "Robots", href: "/robots", cityScoped: true, icon: "🤖" },
  { label: "Papers", href: "/papers", cityScoped: true, icon: "📄" },
  { label: "Sponsors", href: "/sponsors", cityScoped: true, icon: "🤝" },
  { label: "Awards", href: "/awards", cityScoped: true, icon: "🏆" },
  { label: "Jobs", href: "/jobs", cityScoped: true, icon: "💼" },
  { label: "Photos", href: "/photos", cityScoped: true, icon: "📷" },
  { label: "Livestream", href: "/livestream", cityScoped: true, icon: "📺" },
  { label: "Skills", href: "/skills", cityScoped: false, icon: "🧰" },
  { label: "Memes", href: "/memes", cityScoped: true, icon: "😂" },
  { label: "Chat", href: "/chats", cityScoped: true, icon: "💬" },
  { label: "Bot", href: "/bot", cityScoped: true, icon: "✨" },
  { label: "Logs", href: "/logs", cityScoped: true, icon: "📜" },
];
