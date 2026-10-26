import type { Metadata } from "next";
import Header from '@/components/header';
import "./globals.css";

export const metadata: Metadata = {
  title: "Kale Kuşatması | İki sancak, tek meydan",
  description: "İki kişilik çevrimiçi Orta Çağ strateji oyunu. Ordunu topla, bölgeleri ele geçir ve rakibin kalesini kuşat.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body><Header/>{children}</body>
    </html>
  );
}
