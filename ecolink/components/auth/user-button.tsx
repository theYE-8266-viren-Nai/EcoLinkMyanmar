"use client";

import { UserButton } from "@clerk/nextjs";

export function EcoLinkUserButton() {
  return (
    <UserButton
      appearance={{
        elements: {
          userButtonAvatarBox: "size-9",
        },
      }}
    />
  );
}
