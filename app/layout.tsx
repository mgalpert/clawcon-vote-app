import "./globals.css";

export const metadata = {
  title: "ClawdCon – Submit & Vote",
  description: "Submit and vote on demos and topics for ClawdCon."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
