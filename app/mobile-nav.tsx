"use client";

import { useMemo } from "react";
import { withCity } from "../lib/cities";

type NavItem = {
  label: string;
  href: string;
  cityScoped?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { label: "projects", href: "/", cityScoped: true },
  { label: "topics", href: "/", cityScoped: true },
  { label: "worldwide", href: "/worldwide", cityScoped: false },
  { label: "events", href: "/events", cityScoped: true },
  { label: "speakers", href: "/speakers", cityScoped: true },
  { label: "robots", href: "/robots", cityScoped: true },
  { label: "papers", href: "/papers", cityScoped: true },
  { label: "sponsors", href: "/sponsors", cityScoped: true },
  { label: "awards", href: "/awards", cityScoped: true },
  { label: "jobs", href: "/jobs", cityScoped: true },
  { label: "photos", href: "/photos", cityScoped: true },
  { label: "livestream", href: "/livestream", cityScoped: true },
  { label: "skills", href: "/skills", cityScoped: false },
  { label: "memes", href: "/memes", cityScoped: true },
  { label: "join the chat", href: "/chats", cityScoped: true },
];

export default function MobileNav(props: {
  cityKey: string;
  activePath: string;
}) {
  const items = useMemo(() => {
    return NAV_ITEMS.map((i) => ({
      ...i,
      url: i.cityScoped ? withCity(i.href, props.cityKey as any) : i.href,
    }));
  }, [props.cityKey]);

  return (
    <details className="hn-mobile-nav">
      <summary className="hn-mobile-nav-summary" aria-label="Open menu">
        ☰
      </summary>
      <div className="hn-mobile-nav-panel" role="menu">
        {items.map((i) => {
          const isActive =
            i.href === props.activePath ||
            (i.href !== "/" && props.activePath.startsWith(i.href));
          return (
            <a
              key={i.label}
              href={i.url}
              className={`hn-linktree ${isActive ? "active" : ""}`}
              role="menuitem"
            >
              {i.label}
            </a>
          );
        })}
      </div>
    </details>
  );
}
