import { auth, currentUser } from "@clerk/nextjs/server";

export async function getCurrentAuth() {
  return auth();
}

export async function getCurrentUser() {
  return currentUser();
}

export async function requireUserId() {
  const { userId, redirectToSignIn } = await auth();
  if (!userId) return redirectToSignIn();

  return userId;
}
