import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "ClubOS — Calcutta AI Club",
  description: "The club's collective memory and hype engine.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav className="nav">
          <span className="brand">ClubOS</span>
          <Link href="/">Wall</Link>
          <Link href="/sessions">Sessions</Link>
          <Link href="/join">Join</Link>
        </nav>
        {children}
      </body>
    </html>
  );
}
