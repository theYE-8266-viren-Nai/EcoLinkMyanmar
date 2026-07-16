import { AuthLayout } from "@/components/auth/auth-layout";
import { EcoLinkSignIn } from "@/components/auth/sign-in";

export default function SignInPage() {
  return (
    <AuthLayout
      description="Access your recycling dashboard, rewards, and pickup activity."
      title="Welcome back"
    >
      <EcoLinkSignIn />
    </AuthLayout>
  );
}
