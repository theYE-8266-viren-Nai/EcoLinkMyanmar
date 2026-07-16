import { AuthLayout } from "@/components/auth/auth-layout";
import { EcoLinkSignUp } from "@/components/auth/sign-up";

export default function SignUpPage() {
  return (
    <AuthLayout
      description="Create an EcoLink account to turn recycling activity into measurable impact."
      title="Join EcoLink"
    >
      <EcoLinkSignUp />
    </AuthLayout>
  );
}
