"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";

export function EcoLinkUserButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function signOut() {
    setIsPending(true);
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.refresh();
    router.push("/");
  }

  return (
    <Button
      aria-label="Sign out"
      disabled={isPending}
      onClick={signOut}
      size="icon"
      type="button"
      variant="outline"
    >
      <LogOut aria-hidden="true" className="size-4" />
    </Button>
  );
}
