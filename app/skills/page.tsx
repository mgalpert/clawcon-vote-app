import { Suspense } from "react";
import SkillsClient from "./skills-client";

export const metadata = {
  title: "Skills – Claw Con",
  description: "Browse agent skills from ClawHub.",
};

export default function SkillsPage() {
  return (
    <Suspense fallback={null}>
      <SkillsClient />
    </Suspense>
  );
}
