import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wiselista — Property photos, AI-edited",
  description: "Capture property photos, submit for AI editing, get pro-quality listings in minutes. For rental managers, agents & homeowners.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let user: { email?: string } | null = null;
  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      const supabase = await createClient();
      if (supabase) {
        const { data } = await supabase.auth.getUser();
        user = data?.user ?? null;
      }
    }
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
