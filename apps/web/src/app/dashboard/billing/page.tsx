import { redirect } from "next/navigation";

// Billing moved under Settings. Kept as a redirect so existing links (Stripe
// portal return URLs, payment-failed emails) don't 404.
export default function BillingRedirect() {
  redirect("/dashboard/settings/billing");
}
