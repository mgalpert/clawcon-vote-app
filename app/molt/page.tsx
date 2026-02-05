export const metadata = {
  title: "Molt – ClawdCon SF",
};

export default function MoltPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#000",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 0,
        margin: 0,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/molt.png"
        alt="Molt"
        style={{
          maxWidth: "100%",
          maxHeight: "100vh",
          objectFit: "contain",
        }}
      />
    </div>
  );
}
