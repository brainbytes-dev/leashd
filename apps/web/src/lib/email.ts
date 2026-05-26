import { Resend } from 'resend';
import { DEMO_MODE } from '@/lib/demo-mode';

let resend: Resend | null = null;

function getResend(): Resend {
  if (!resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY environment variable is not set');
    }
    resend = new Resend(apiKey);
  }
  return resend;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export async function sendWelcomeEmail(name: string, email: string) {
  if (DEMO_MODE) {
    console.log(`[DEMO] Would send welcome email to ${email}`);
    return { data: { id: 'demo-email-id' }, error: null };
  }
  try {
    const result = await getResend().emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@example.com',
      to: email,
      subject: `Welcome ${escapeHtml(name)}!`,
      html: `
        <h1>Welcome to our platform!</h1>
        <p>Hi ${escapeHtml(name)},</p>
        <p>Thanks for signing up. We're excited to have you on board.</p>
        <p>Get started by logging into your dashboard.</p>
      `,
    });
    return result;
  } catch (error) {
    console.error('Failed to send welcome email:', error);
    throw error;
  }
}

export async function sendPaymentFailedEmail(email: string) {
  if (DEMO_MODE) {
    console.log(`[DEMO] Would send payment failed email to ${email}`);
    return { data: { id: 'demo-email-id' }, error: null };
  }
  try {
    const result = await getResend().emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@example.com',
      to: email,
      subject: 'Payment Failed - Action Required',
      html: `
        <h1>Payment Failed</h1>
        <p>Hi,</p>
        <p>We tried to process your subscription payment but it failed.</p>
        <p>Please update your payment method in your account settings.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing">Update Payment Method</a>
      `,
    });
    return result;
  } catch (error) {
    console.error('Failed to send payment failed email:', error);
    throw error;
  }
}

export interface AlertPayload {
  decision: string;
  agentName?: string | null;
  rail?: string | null;
  endpoint?: string | null;
  amount?: string | null;
  reason?: string | null;
  occurredAt: string;
}

export async function sendAlertEmail(email: string, a: AlertPayload) {
  const subject = `leashd: ${a.decision.toUpperCase()} — ${a.agentName ?? "agent"}`;
  if (DEMO_MODE) {
    console.log(`[DEMO] Would send alert email to ${email}: ${subject}`);
    return { data: { id: 'demo-email-id' }, error: null };
  }
  try {
    return await getResend().emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@example.com',
      to: email,
      subject,
      html: `
        <h2>Policy event: ${escapeHtml(a.decision)}</h2>
        <table cellpadding="4" style="font-family:monospace;font-size:13px">
          <tr><td>agent</td><td>${escapeHtml(a.agentName ?? "—")}</td></tr>
          <tr><td>decision</td><td><b>${escapeHtml(a.decision)}</b></td></tr>
          <tr><td>rail</td><td>${escapeHtml(a.rail ?? "—")}</td></tr>
          <tr><td>endpoint</td><td>${escapeHtml(a.endpoint ?? "—")}</td></tr>
          <tr><td>amount</td><td>${escapeHtml(a.amount ?? "—")}</td></tr>
          <tr><td>reason</td><td>${escapeHtml(a.reason ?? "—")}</td></tr>
          <tr><td>at</td><td>${escapeHtml(a.occurredAt)}</td></tr>
        </table>
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/audit">View the audit feed</a></p>
      `,
    });
  } catch (error) {
    console.error('Failed to send alert email:', error);
    throw error;
  }
}

export async function sendSubscriptionCanceledEmail(email: string) {
  if (DEMO_MODE) {
    console.log(`[DEMO] Would send subscription canceled email to ${email}`);
    return { data: { id: 'demo-email-id' }, error: null };
  }
  try {
    const result = await getResend().emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@example.com',
      to: email,
      subject: 'Subscription Canceled',
      html: `
        <h1>Subscription Canceled</h1>
        <p>Hi,</p>
        <p>Your subscription has been canceled and will end at the next billing cycle.</p>
        <p>If you have any questions, please reach out to our support team.</p>
      `,
    });
    return result;
  } catch (error) {
    console.error('Failed to send subscription canceled email:', error);
    throw error;
  }
}
