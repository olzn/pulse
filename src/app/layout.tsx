import { Agentation } from "agentation";
import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pulse — Gnosis Chain Vitals",
  description:
    "A lightweight dashboard that surfaces the vital signs of Gnosis Chain in language and visuals that anyone can understand.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          rel="preload"
          href="/fonts/inter-variable.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
        {process.env.NODE_ENV === "development" && <Agentation />}
      </body>
    </html>
  );
}
