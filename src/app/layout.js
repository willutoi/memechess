import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import BGMPlayer from '../components/BGMPlayer';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "MemeChess | The Ultimate Brainrot Chess",
  description: "Play chess with viral meme skins, sounds, and earn MemeCoins.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <div className="ambient-bg">
          <div className="ambient-grid" />
          <div className="ambient-blob blob-1" />
          <div className="ambient-blob blob-2" />
          <div className="ambient-blob blob-3" />
        </div>
        {children}
        <BGMPlayer />
      </body>
    </html>
  );
}
