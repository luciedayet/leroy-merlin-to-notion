import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Leroy Merlin → Notion",
  description: "Importez vos factures Leroy Merlin dans Notion",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="bg-gray-50 min-h-screen">{children}</body>
    </html>
  );
}
