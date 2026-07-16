import { SignUp } from "@clerk/nextjs";

export function EcoLinkSignUp() {
  return (
    <SignUp
      path="/sign-up"
      routing="path"
      signInUrl="/sign-in"
      fallbackRedirectUrl="/dashboard"
    />
  );
}
