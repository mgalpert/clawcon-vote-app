export type CityKey = "san-francisco" | "denver" | "tokyo" | "kona";

export type CityConfig = {
  key: CityKey;
  label: string;
  shortLabel: string;
  /** Supabase `events.slug` used by the RPC `get_submissions_with_votes(_event_slug)` */
  eventSlug: string;
  eventPageUrl?: string;
  livestreamUrl?: string;
  photosAvailable?: boolean;
};

export const CITIES: CityConfig[] = [
  {
    key: "san-francisco",
    label: "San Francisco",
    shortLabel: "SF",
    eventSlug: "claw-show-tell-san-francisco-feb-2026",
    eventPageUrl: "https://lu.ma/moltbot-sf-show-tell",
    livestreamUrl: "https://streamyard.com/watch/tRKvWpftFH8z",
    photosAvailable: true,
  },
  {
    key: "denver",
    label: "Denver",
    shortLabel: "Denver",
    eventSlug: "claw-show-tell-denver-2026",
  },
  {
    key: "tokyo",
    label: "Tokyo",
    shortLabel: "Tokyo",
    eventSlug: "claw-show-tell-tokyo-2026",
  },
  {
    key: "kona",
    label: "Kona",
    shortLabel: "Kona",
    eventSlug: "claw-show-tell-kona-2026",
  },
];

export const DEFAULT_CITY_KEY: CityKey = "san-francisco";

export function getCity(key: string | null | undefined): CityConfig {
  return (
    CITIES.find((c) => c.key === key) ||
    CITIES.find((c) => c.key === DEFAULT_CITY_KEY)!
  );
}

export function withCity(path: string, cityKey: CityKey): string {
  const hasQuery = path.includes("?");
  const sep = hasQuery ? "&" : "?";
  return `${path}${sep}city=${encodeURIComponent(cityKey)}`;
}
