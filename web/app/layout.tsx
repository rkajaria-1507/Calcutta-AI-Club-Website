import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Calcutta AI Club",
  description:
    "The club that remembers: who's in the room, what they've built, and what they need next.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
