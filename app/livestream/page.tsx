export const metadata = {
  title: "Livestream – Claw Con",
};

import { getCityFromSearchParams } from "../city-layout";

export default function LivestreamPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const city = getCityFromSearchParams(searchParams);
  const url = city.livestreamUrl || null;

  return (
    <main style={{ padding: 24, maxWidth: 1000, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
        Livestream
      </h1>
      <p style={{ marginBottom: 16, color: "#4b5563" }}>
        Watch the Claw Con {city.label} stream/recording.
      </p>

      {url ? (
        <>
          <div
            style={{
              width: "100%",
              aspectRatio: "16 / 9",
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              overflow: "hidden",
              background: "#000",
            }}
          >
            <iframe
              src={url}
              title={`Claw Con ${city.label} Livestream`}
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              style={{ width: "100%", height: "100%", border: 0 }}
            />
          </div>

          <p style={{ marginTop: 12, color: "#6b7280" }}>
            If the embed doesn’t load, open it here: <a href={url}>{url}</a>
          </p>
        </>
      ) : (
        <p style={{ color: "#6b7280" }}>
          No livestream link added yet for {city.label}.
        </p>
      )}
    </main>
  );
}
