export const metadata = {
  title: "Skills – Claw Con",
  description: "Browse agent skills from ClawHub.",
};

export default function SkillsPage() {
  const url = "https://clawhub.ai/skills";

  return (
    <main style={{ padding: 0, maxWidth: 1400, margin: "0 auto" }}>
      <div style={{ padding: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
          Skills
        </h1>
        <p style={{ color: "#4b5563", marginBottom: 16 }}>
          Pulled from{" "}
          <a href={url} target="_blank" rel="noreferrer">
            clawhub.ai/skills
          </a>
          .
        </p>
      </div>

      <div
        style={{
          borderTop: "1px solid #e5e7eb",
          height: "calc(100vh - 140px)",
          minHeight: 600,
        }}
      >
        <iframe
          src={url}
          title="ClawHub Skills"
          style={{ width: "100%", height: "100%", border: 0 }}
        />
      </div>
    </main>
  );
}
