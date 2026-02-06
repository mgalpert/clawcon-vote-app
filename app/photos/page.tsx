import sfPhotos from "./sfPhotos.json";

export const metadata = {
  title: "Photos & Videos – Claw Con",
};

// Placeholder: add mp4 URLs here as we collect them.
const sfVideos: string[] = [];

function MediaGrid({ urls }: { urls: string[] }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
        gap: 12,
      }}
    >
      {urls.map((url) => (
        <a
          key={url}
          href={url}
          target="_blank"
          rel="noreferrer"
          style={{
            display: "block",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            overflow: "hidden",
            background: "#fff",
          }}
        >
          {/* Using plain img to avoid next/image remote host config */}
          <img
            src={url}
            alt="Claw Con photo"
            loading="lazy"
            style={{
              width: "100%",
              height: 220,
              objectFit: "cover",
              display: "block",
            }}
          />
        </a>
      ))}
    </div>
  );
}

import { getCityFromSearchParams } from "../city-layout";

export default function PhotosPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const city = getCityFromSearchParams(searchParams);

  return (
    <main style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
        Photos & Videos
      </h1>

      {city.key === "san-francisco" ? (
        <>
          <p style={{ marginBottom: 24, color: "#4b5563" }}>
            SF photos sourced from{" "}
            <a
              href="https://www.raysurfer.com/blog/claw-con"
              target="_blank"
              rel="noreferrer"
            >
              raysurfer.com/blog/claw-con
            </a>
            .
          </p>

          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>
              Claw Con San Francisco
            </h2>
            <MediaGrid urls={sfPhotos} />
          </section>
        </>
      ) : (
        <p style={{ marginBottom: 24, color: "#6b7280" }}>
          No photos added yet for {city.label}.
        </p>
      )}

      <section>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>
          Videos
        </h2>
        {sfVideos.length === 0 ? (
          <p style={{ color: "#6b7280" }}>No videos added yet.</p>
        ) : (
          <ul>
            {sfVideos.map((v) => (
              <li key={v}>
                <a href={v} target="_blank" rel="noreferrer">
                  {v}
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
