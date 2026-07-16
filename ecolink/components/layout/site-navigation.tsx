import { AuthenticationButtons } from "@/components/auth/authentication-buttons";
import { Navbar } from "@/components/layout/navbar";

export function SiteNavigation() {
  return <Navbar actions={<AuthenticationButtons />} />;
}
