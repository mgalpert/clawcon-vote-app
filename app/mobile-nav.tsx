"use client";

import { useMemo } from "react";
import { withCity } from "../lib/cities";

type NavItem = {
  label: string;
  href: string;
  cityScoped?: boolean;
  external?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { label: "demos", href: "/", cityScoped: true },
  { label: "topics", href: "/", cityScoped: true },
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
  { label: "merch", href: "https://clawcon.myshopify.com/", cityScoped: false, external: true },
  { label: "join the chat", href: "/chats", cityScoped: true },
  { label: "logs", href: "/logs", cityScoped: true },
];

export default function MobileNav(props: {
  cityKey: string;
  activePath: string;
}) {
  const items = useMemo(() => {
    return NAV_ITEMS.map((i) => ({
      ...i,
      url: i.external ? i.href : (i.cityScoped ? withCity(i.href, props.cityKey as any) : i.href),
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
            !i.external && (i.href === props.activePath ||
            (i.href !== "/" && props.activePath.startsWith(i.href)));
          return (
            <a
              key={i.label}
              href={i.url}
              className={`hn-linktree ${isActive ? "active" : ""}`}
              role="menuitem"
              {...(i.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            >
              {i.label}{i.external ? " ↗" : ""}
            </a>
          );
        })}
      </div>
    </details>
  );
}
