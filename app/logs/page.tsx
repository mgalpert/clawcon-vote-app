import { Suspense } from "react";
import LogsClient from "./logs-client";

export default function LogsPage() {
  return (
    <Suspense fallback={null}>
      <LogsClient />
    </Suspense>
  );
}
