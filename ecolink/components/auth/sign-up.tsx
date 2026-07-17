"use client";

import { SignUp } from "@clerk/nextjs";

export function EcoLinkSignUp() {
  return <SignUp fallbackRedirectUrl="/" path="/sign-up" routing="path" signInUrl="/sign-in" />;
}
