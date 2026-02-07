import "./globals.css";

export const metadata = {
  title: "Claw Con – Submit & Vote",
  description: "Submit and vote on demos and topics for Claw Con.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
