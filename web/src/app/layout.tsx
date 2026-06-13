import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import "./globals.css";

// Always run with current request so header reflects real session (no cached "signed in" when session is broken).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Wiselista — Property photos, AI-edited",
  description: "Capture property photos, submit for AI editing, get pro-quality listings. For rental managers, agents & homeowners.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let user: { email?: string } | null = null;
  try {
    const authUser = await getCurrentUser();
    user = authUser ? { email: authUser.email } : null;
  } catch {
    // Never throw from layout — show signed-out header so app still renders
  }

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col bg-wiselista-surface antialiased">
        <Header user={user} />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
