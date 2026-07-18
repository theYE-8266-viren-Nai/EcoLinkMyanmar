"use client";

import Link from "next/link";

import { EcoLinkUserButton } from "@/components/auth/user-button";
import { Button, buttonVariants } from "@/components/ui/button";
import { useSupabaseUser } from "@/hooks/use-supabase-user";

export function AuthenticationButtons() {
  const { isLoaded, user } = useSupabaseUser();

  if (!isLoaded) return <Button disabled type="button">Checking</Button>;
  if (user) return <EcoLinkUserButton />;

  return <Link className={buttonVariants()} href="/sign-in">Sign in</Link>;
}
