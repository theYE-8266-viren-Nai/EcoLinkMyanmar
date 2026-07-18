import { AuthLayout } from "@/components/auth/auth-layout";
import { EcoLinkSignIn } from "@/components/auth/sign-in";
import { Suspense } from "react";

export default function SignInPage() {
  return (
    <AuthLayout
      descriptionKey="auth.welcomeHelp"
      titleKey="auth.welcome"
    >
      <Suspense>
        <EcoLinkSignIn />
      </Suspense>
    </AuthLayout>
  );
}
