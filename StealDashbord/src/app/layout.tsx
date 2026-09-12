import type { Metadata } from "next";
import { Kanit, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "./providers";
import { PageviewTracker } from "@/shared/PageviewTracker";

const kanit = Kanit({
  variable: "--font-kanit",
  subsets: ["latin", "thai"],
  weight: ["400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// ฟอนต์หลักทั้งเว็บ — Inter 18pt Bold ไฟล์เดียว weight 700
const bodyFont = localFont({
  src: "./fonts/Inter_18pt-Bold.ttf",
  variable: "--font-body",
  weight: "700",
  style: "normal",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Xsprob",
  description: "Xsprob — Real time Steal An Egg tracking across your machines.",
  icons: { icon: "/favicon.ico" },
};

export const viewport = {
  themeColor: "#0b0d10",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${kanit.variable} ${geistMono.variable} ${bodyFont.variable} h-full antialiased`}
    >
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css" integrity="sha512-SnH5WK+bZxgPHs44uWIX+LLJAJ9/2PkPKZ5QiAj6Ta86w+fsb2TkcmfRyVX3pBnMFcV7oQPJkl9QevSCWr3W6A==" crossOrigin="anonymous" referrerPolicy="no-referrer" />
      </head>
      <body className="min-h-full flex flex-col">
        <Providers>
          <PageviewTracker />
          {children}
        </Providers>
      </body>
    </html>
  );
}
