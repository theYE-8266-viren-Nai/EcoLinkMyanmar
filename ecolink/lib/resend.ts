import { Resend } from "resend";

let resendClient: Resend | null = null;

export function getResendClient() {
  if (!process.env.RESEND_API_KEY) {
    return null;
  }

  resendClient ??= new Resend(process.env.RESEND_API_KEY);

  return resendClient;
}

export function getDefaultFromEmail() {
  return process.env.RESEND_FROM_EMAIL ?? "EcoLink <hello@example.com>";
}
