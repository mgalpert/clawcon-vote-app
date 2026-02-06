import { Suspense } from "react";
import ChatsClient from "./chats-client";

export const metadata = {
  title: "Chats – Claw Con",
  description: "Links to Claw Con chats + a place to submit more.",
};

export default function ChatsPage() {
  return (
    <Suspense fallback={null}>
      <ChatsClient />
    </Suspense>
  );
}
