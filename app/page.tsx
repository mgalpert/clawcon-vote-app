import { Suspense } from "react";
import SubmissionBoard from "./submission-board";

export default function Page() {
  return (
    <main>
      <Suspense fallback={null}>
        <SubmissionBoard />
      </Suspense>
    </main>
  );
}
