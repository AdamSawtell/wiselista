import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wiselista — Property photos, AI-edited",
  description:
    "Capture property photos, submit for AI editing, get pro-quality listings. For rental managers, agents & homeowners.",
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
