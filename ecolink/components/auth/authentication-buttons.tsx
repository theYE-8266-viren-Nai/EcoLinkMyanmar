"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { EcoLinkUserButton } from "@/components/auth/user-button";
import { buttonVariants } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";

export function AuthenticationButtons() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let isMounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!isMounted) {
        return;
      }

      setIsSignedIn(Boolean(data.user));
      setIsLoaded(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsSignedIn(Boolean(session?.user));
      setIsLoaded(true);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (!isLoaded) {
    return (
      <div
        aria-label="Loading authentication"
        className="size-9 rounded-lg border bg-muted"
      />
    );
  }

  if (isSignedIn) {
    return <EcoLinkUserButton />;
  }

  return (
    <div className="flex items-center gap-2">
      <Link className={buttonVariants({ variant: "ghost" })} href="/sign-in">
        Sign In
      </Link>
      <Link className={buttonVariants()} href="/sign-up">
        Sign Up
      </Link>
    </div>
  );
}
