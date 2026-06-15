import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ads Spy — veille pubs concurrents",
  description: "Top des pubs Meta concurrentes qui prennent du budget.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
