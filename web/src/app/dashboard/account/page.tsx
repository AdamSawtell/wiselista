import { AgentProfileForm } from "@/components/AgentProfileForm";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const supabase = await createClient();
  if (!supabase) redirect("/login");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <p className="text-sm font-medium text-wiselista-accent">Account</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Your profile</h1>
        <p className="mt-2 text-sm text-slate-600">
          Signed in as <span className="font-medium text-slate-800">{user.email}</span>
        </p>
      </div>

      <div className="rounded-xl border border-wiselista-border bg-white p-6 shadow-sm sm:p-8">
        <AgentProfileForm />
      </div>
    </div>
  );
}
