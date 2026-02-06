import { Suspense } from "react";
import AwardsClient from "./awards-client";

export const metadata = {
  title: "Awards – Claw Con",
  description: "Prizes, grants, challenges, and bounties from sponsors.",
};

export default function AwardsPage() {
  return (
    <Suspense fallback={null}>
      <AwardsClient />
    </Suspense>
  );
}
