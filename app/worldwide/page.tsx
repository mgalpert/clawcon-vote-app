import { Suspense } from "react";
import WorldwideClient from "./worldwide-client";

export const metadata = {
  title: "Worldwide – Claw Con",
  description: "All cities, combined into one feed.",
};

export default function WorldwidePage() {
  return (
    <Suspense fallback={null}>
      <WorldwideClient />
    </Suspense>
  );
}
