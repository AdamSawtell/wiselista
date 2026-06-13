import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getCurrentUser } from "@/lib/auth";

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user: { email?: string } | null = null;
  try {
    const authUser = await getCurrentUser();
    user = authUser ? { email: authUser.email } : null;
  } catch {
    // show signed-out header
  }

  return (
    <>
      <Header user={user} />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
