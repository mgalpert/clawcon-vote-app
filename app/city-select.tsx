"use client";

import { useRouter } from "next/navigation";
import { CITIES, withCity } from "../lib/cities";

export default function CitySelect(props: {
  path: string;
  activeCityKey: string;
}) {
  const router = useRouter();

  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      {/* city */}
      <select
        value={props.activeCityKey}
        onChange={(e) => {
          const next = e.target.value;
          if (next === "worldwide") {
            router.push("/worldwide");
            return;
          }
          router.push(withCity(props.path, next as any));
        }}
        style={{ padding: "2px 6px" }}
        aria-label="Select city"
      >
        <option value="worldwide">Worldwide</option>
        {CITIES.map((c) => (
          <option key={c.key} value={c.key}>
            {c.label}
          </option>
        ))}
      </select>
    </label>
  );
}
