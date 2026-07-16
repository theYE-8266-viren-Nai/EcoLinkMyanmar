"use server";

import { auth } from "@clerk/nextjs/server";

import { recyclingIntentSchema } from "@/schemas/recycling-intent";
import type { ActionResult } from "@/types/actions";
import type { RecyclingIntentConfirmation } from "@/types/recycling";

export async function submitRecyclingIntentAction(
  input: unknown,
): Promise<ActionResult<RecyclingIntentConfirmation>> {
  const parsed = recyclingIntentSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
      message: "Check the highlighted fields and try again.",
    };
  }

  const { userId } = await auth();

  return {
    ok: true,
    data: {
      email: parsed.data.email,
      materialType: parsed.data.materialType,
      pickupWindow: parsed.data.pickupWindow,
      submittedByUserId: userId,
    },
    message:
      "Thanks. This example action validated your recycling intent and is ready to connect to Prisma.",
  };
}
