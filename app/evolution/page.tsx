import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Evolution | ClawdCon",
  description: "The evolution of work",
};

export default function EvolutionPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0a0a0a",
        padding: "2rem",
      }}
    >
      <Image
        src="/evolution.jpg"
        alt="Evolution of work — from ape to lobster rider"
        width={1200}
        height={600}
        style={{
          maxWidth: "100%",
          height: "auto",
          borderRadius: "12px",
        }}
        priority
      />
    </main>
  );
}
