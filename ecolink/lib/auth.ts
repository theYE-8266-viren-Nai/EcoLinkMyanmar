import { auth } from "@clerk/nextjs/server";

export async function getCurrentAuth() {
  return auth();
}

export async function requireUserId() {
  const { userId } = await auth.protect();

  return userId;
}
