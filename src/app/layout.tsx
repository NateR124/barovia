import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Curse of Strahd — Campaign Timeline",
  description:
    "An interactive map tracking the party's journey through Barovia.",
  openGraph: {
    title: "Curse of Strahd — Campaign Timeline",
    description:
      "An interactive map tracking the party's journey through Barovia.",
    images: [
      {
        url: "/images/nodes/van-richtens-tower-2.webp",
        width: 1200,
        height: 630,
        alt: "Curse of Strahd — Campaign Timeline",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Curse of Strahd — Campaign Timeline",
    description:
      "An interactive map tracking the party's journey through Barovia.",
    images: ["/images/nodes/van-richtens-tower-2.webp"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700;900&family=Spectral:ital,wght@0,300;0,400;0,600;0,700;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
