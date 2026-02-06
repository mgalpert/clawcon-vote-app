import { Suspense } from "react";
import EventsClient from "./events-client";

export const metadata = {
  title: "Events – Claw Con",
  description: "Browse and submit Claw Con events.",
};

export default function EventsPage() {
  return (
    <Suspense fallback={null}>
      <EventsClient />
    </Suspense>
  );
}
