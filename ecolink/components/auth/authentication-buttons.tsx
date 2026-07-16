"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";

import { EcoLinkUserButton } from "@/components/auth/user-button";
import { buttonVariants } from "@/components/ui/button";

export function AuthenticationButtons() {
  const { isLoaded, isSignedIn } = useUser();

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
