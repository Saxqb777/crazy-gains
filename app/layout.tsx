import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "THE PIT",
  description: "Autonomous multi-agent trading floor",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
