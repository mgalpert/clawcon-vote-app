"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import CitySelect from "../city-select";
import { DEFAULT_CITY_KEY, withCity } from "../../lib/cities";
import { NAV_ITEMS } from "./nav";

type ThemeMode = "system" | "light" | "dark";

export default function AppShell(props: {
  children: React.ReactNode;
  title?: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const cityKey = (searchParams.get("city") || DEFAULT_CITY_KEY) as any;

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    try {
      return (
        (window.localStorage.getItem("clawdcon.theme") as ThemeMode) ||
        "system"
      );
    } catch {
      return "system";
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem("clawdcon.theme", themeMode);
    } catch {}

    // Match OpenClaw gateway behavior: system uses prefers-color-scheme;
    // explicit light/dark sets an attribute.
    if (themeMode === "system") {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.setAttribute("data-theme", themeMode);
    }
  }, [themeMode]);

  const items = useMemo(() => {
    return NAV_ITEMS.map((i) => ({
      ...i,
      url: i.cityScoped ? withCity(i.href, cityKey) : i.href,
      isActive:
        i.href === "/"
          ? pathname === "/"
          : pathname === i.href || pathname.startsWith(i.href + "/"),
    }));
  }, [cityKey, pathname]);

  return (
    <div className={`oc-shell ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
      <aside className="oc-sidebar" aria-label="Primary navigation">
        <div className="oc-sidebar-top">
          <Link href={withCity("/", cityKey)} className="oc-brand">
            <span className="oc-brand-icon">🦞</span>
            {sidebarOpen && <span className="oc-brand-text">ClawdCon</span>}
          </Link>
          <button
            className="oc-icon-button"
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            title={sidebarOpen ? "Collapse" : "Expand"}
            type="button"
          >
            {sidebarOpen ? "◀" : "▶"}
          </button>
        </div>

        <nav className="oc-nav">
          {items.map((i) => (
            <Link
              key={i.label}
              href={i.url}
              className={`oc-nav-item ${i.isActive ? "active" : ""}`}
              title={i.label}
            >
              <span className="oc-nav-icon" aria-hidden="true">
                {i.icon ?? "•"}
              </span>
              {sidebarOpen && <span className="oc-nav-label">{i.label}</span>}
            </Link>
          ))}
        </nav>

        <div className="oc-sidebar-bottom">
          <div className="oc-theme" aria-label="Theme mode">
            <button
              type="button"
              className={`oc-theme-btn ${themeMode === "system" ? "active" : ""}`}
              onClick={() => setThemeMode("system")}
              title="System"
            >
              System
            </button>
            <button
              type="button"
              className={`oc-theme-btn ${themeMode === "light" ? "active" : ""}`}
              onClick={() => setThemeMode("light")}
              title="Light"
            >
              Light
            </button>
            <button
              type="button"
              className={`oc-theme-btn ${themeMode === "dark" ? "active" : ""}`}
              onClick={() => setThemeMode("dark")}
              title="Dark"
            >
              Dark
            </button>
          </div>

          {sidebarOpen && (
            <div className="oc-sidebar-hint">
              <div className="oc-hint-title">Tip</div>
              <div className="oc-hint-body">
                Share the URL with <code>?city=sf</code> etc.
              </div>
            </div>
          )}
        </div>
      </aside>

      <div className="oc-main">
        <header className="oc-topbar">
          <div className="oc-topbar-left">
            <div className="oc-page-title">{props.title ?? "ClawdCon"}</div>
          </div>
          <div className="oc-topbar-right">
            <CitySelect path={pathname === "/" ? "/" : pathname} activeCityKey={cityKey} />
          </div>
        </header>

        <div className="oc-content">{props.children}</div>
      </div>
    </div>
  );
}
