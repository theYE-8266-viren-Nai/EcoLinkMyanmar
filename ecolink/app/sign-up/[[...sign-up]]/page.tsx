import { AuthLayout } from "@/components/auth/auth-layout";
import { EcoLinkSignUp } from "@/components/auth/sign-up";

export default function SignUpPage() {
  return (
    <AuthLayout
      descriptionKey="auth.joinHelp"
      titleKey="auth.join"
    >
      <EcoLinkSignUp />
    </AuthLayout>
  );
}
