import type { Metadata } from "next";
import { LegalDoc } from "@/components/LegalDoc";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Terms of use",
  description: "Terms for using Wiselista to capture, enhance, and download listing photos.",
};

export default function TermsPage() {
  return (
    <LegalDoc title="Terms of use" updated="15 August 2026">
      <section>
        <h2>The service</h2>
        <p>
          Wiselista lets you create a listing project, upload property photos, pay per project,
          and download AI-enhanced images. Core is AUD $29 for up to 15 photos. Pro is AUD $49
          for up to 25 photos, plus share and customer-capture links.
        </p>
      </section>

      <section>
        <h2>Your account</h2>
        <p>
          You must use a real email address and keep your password private. You are responsible
          for activity on your account. Email{" "}
          <a href="mailto:info@wiselista.com">info@wiselista.com</a> if you think someone else
          has used it.
        </p>
      </section>

      <section>
        <h2>Photos and permission</h2>
        <p>
          You confirm you have the right to upload the photos — as the agent, owner, or someone
          they asked to shoot. You give Wiselista a licence to store the files, send them to our
          enhancement partner, and show them back to you (and to anyone you share a link with).
          You keep ownership of your photos.
        </p>
      </section>

      <section>
        <h2>Payment</h2>
        <p>
          You pay when you submit a project. Stripe handles the card payment and emails a
          receipt. Prices are in Australian dollars. Pilot or promo codes may skip payment when
          we have agreed that in writing or issued a code.
        </p>
      </section>

      <section>
        <h2>Results</h2>
        <p>
          Enhancement improves exposure, colour, and sharpness for listing use. It does not
          replace a photographer, and it will not fix a badly framed or obstructed shot. If a
          job fails, contact us with the job ID and we will retry or refund that project.
        </p>
      </section>

      <section>
        <h2>Acceptable use</h2>
        <p>
          Do not upload images you do not have rights to, or use the service for anything other
          than property listing content. We may suspend an account that abuses the service or
          other people.
        </p>
      </section>

      <section>
        <h2>Availability</h2>
        <p>
          We aim to keep the site and processing running. We do not promise uninterrupted
          access. Projects expire after 60 days (Core) or 90 days (Pro) from when they are
          ready, unless we agree otherwise.
        </p>
      </section>

      <section>
        <h2>Liability</h2>
        <p>
          To the extent the law allows, Wiselista is not liable for lost listings, delayed
          campaigns, or indirect loss. Our liability for a project is limited to the amount you
          paid for that project. Your consumer rights under Australian or New Zealand law still
          apply.
        </p>
      </section>

      <section>
        <h2>Changes</h2>
        <p>
          We may update these terms. The date at the top of this page is the current version.
          Continued use after a change means you accept the new terms.
        </p>
      </section>
    </LegalDoc>
  );
}
