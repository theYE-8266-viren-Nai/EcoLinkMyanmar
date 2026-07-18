"use client";

import IconButton from "@mui/material/IconButton";
import CircularProgress from "@mui/material/CircularProgress";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

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
    <IconButton
      aria-label="Sign out"
      disabled={isSigningOut}
      onClick={signOut}
      color="error"
      size="medium"
    >
      {isSigningOut ? (
        <CircularProgress size={20} color="inherit" />
      ) : (
        <LogOut aria-hidden="true" size={20} />
      )}
    </IconButton>
  );
}
