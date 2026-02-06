import { Suspense } from "react";
import MemesClient from "./memes-client";

export const metadata = {
  title: "Memes – Claw Con",
  description: "Browse and submit Claw Con memes.",
};

export default function MemesPage() {
  return (
    <Suspense fallback={null}>
      <MemesClient />
    </Suspense>
  );
}
