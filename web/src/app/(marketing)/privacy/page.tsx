import type { Metadata } from "next";
import { LegalDoc } from "@/components/LegalDoc";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "How Wiselista collects, uses, and stores your account and listing photo data.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalDoc title="Privacy policy" updated="15 August 2026">
      <section>
        <h2>Who we are</h2>
        <p>
          Wiselista provides guided property photo capture and AI enhancement for real estate
          agents, rental managers, and homeowners in Australia and New Zealand.
        </p>
        <p>
          Questions:{" "}
          <a href="mailto:info@wiselista.com">info@wiselista.com</a>.
        </p>
      </section>

      <section>
        <h2>What we collect</h2>
        <ul>
          <li>Account details: email address and a hashed password.</li>
          <li>Profile details you choose to add, such as your name and agency.</li>
          <li>Project details: property name or address you enter, room types, and job status.</li>
          <li>Photos you or your vendor upload for a project.</li>
          <li>Payment records from our card processor (we do not store full card numbers).</li>
          <li>Technical logs needed to run the service: time, path, and error messages.</li>
        </ul>
      </section>

      <section>
        <h2>How we use it</h2>
        <p>We use this information to create your account, process listing photos, take payment, and support you. We do not sell your data. We do not use your listing photos to train public AI models.</p>
      </section>

      <section>
        <h2>Who else sees it</h2>
        <ul>
          <li>
            <strong>Hosting and storage</strong> — accounts, project records, and photo files.
          </li>
          <li>
            <strong>Payment processor</strong> — card payments and receipts. Full card numbers stay with them.
          </li>
          <li>
            <strong>Image enhancement partner</strong> — receives a temporary copy of each photo to enhance it. We store the result in your project.
          </li>
        </ul>
        <p>
          If you use a Pro share or capture link, the person you send it to can see or upload
          photos for that project until the link expires.
        </p>
      </section>

      <section>
        <h2>How long we keep it</h2>
        <p>
          Core projects stay available for 60 days after they are ready. Pro projects stay
          available for 90 days. After that we may delete the photos and project files. Account
          details stay until you ask us to close the account.
        </p>
      </section>

      <section>
        <h2>Your rights</h2>
        <p>
          Under the Australian Privacy Act and the New Zealand Privacy Act you can ask to access,
          correct, or delete your personal information. Email{" "}
          <a href="mailto:info@wiselista.com">info@wiselista.com</a> and we will respond.
        </p>
      </section>

      <section>
        <h2>Cookies</h2>
        <p>
          We use cookies only to keep you signed in and to protect the session. We do not use
          advertising or analytics cookies on this site.
        </p>
      </section>
    </LegalDoc>
  );
}
