import type { Metadata } from "next";
import "./globals.css";

const SITE = "https://wiselista.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: "Wiselista — Property photos, AI-edited",
    template: "%s · Wiselista",
  },
  description:
    "Capture property photos, submit for AI editing, get pro-quality listings. For rental managers, agents & homeowners.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: SITE,
    siteName: "Wiselista",
    title: "Wiselista — Property photos, AI-edited",
    description:
      "Capture property photos, submit for AI editing, get pro-quality listings. For rental managers, agents & homeowners.",
    locale: "en_AU",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Wiselista" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Wiselista — Property photos, AI-edited",
    description:
      "Capture property photos, submit for AI editing, get pro-quality listings. For rental managers, agents & homeowners.",
    images: ["/og.png"],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col bg-wiselista-surface antialiased">
        {children}
      </body>
    </html>
  );
}
