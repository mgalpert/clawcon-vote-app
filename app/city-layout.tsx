// Shared helper for city-aware pages (server components)
import { DEFAULT_CITY_KEY, getCity } from "../lib/cities";

export function getCityFromSearchParams(
  searchParams?: Record<string, string | string[] | undefined>,
) {
  const raw = searchParams?.city;
  const key = Array.isArray(raw) ? raw[0] : raw;
  return getCity(key || DEFAULT_CITY_KEY);
}
