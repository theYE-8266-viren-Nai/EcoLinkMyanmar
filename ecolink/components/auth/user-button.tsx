"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";

export function EcoLinkUserButton() {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function signOut() {
    setIsSigningOut(true);
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    setIsSigningOut(false);
    router.replace("/");
    router.refresh();
  }

  return (
    <Button aria-label="Sign out" disabled={isSigningOut} onClick={signOut} size="icon" type="button" variant="secondary">
      <LogOut aria-hidden="true" />
    </Button>
  );
}
