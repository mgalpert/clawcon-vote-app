import { Suspense } from "react";
import JobsClient from "./jobs-client";

export const metadata = {
  title: "Jobs – Claw Con",
  description: "Job listings shared by the community.",
};

export default function JobsPage() {
  return (
    <Suspense fallback={null}>
      <JobsClient />
    </Suspense>
  );
}
