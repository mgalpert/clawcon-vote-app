import { Suspense } from "react";
import SpeakersClient from "./speakers-client";

export const metadata = {
  title: "Speakers – Claw Con",
  description: "Browse Claw Con speakers.",
};

export default function SpeakersPage() {
  return (
    <Suspense fallback={null}>
      <SpeakersClient />
    </Suspense>
  );
}
