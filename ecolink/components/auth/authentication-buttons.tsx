"use client";

import { Show, SignInButton, UserButton } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";

export function AuthenticationButtons() {
  return (
    <>
      <Show when="signed-out">
        <SignInButton mode="modal">
          <Button type="button">Sign in</Button>
        </SignInButton>
      </Show>
      <Show when="signed-in">
        <UserButton />
      </Show>
    </>
  );
}
