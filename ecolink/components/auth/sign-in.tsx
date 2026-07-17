"use client";

import { SignIn } from "@clerk/nextjs";

export function EcoLinkSignIn() {
  return <SignIn fallbackRedirectUrl="/" path="/sign-in" routing="path" signUpUrl="/sign-up" />;
}
