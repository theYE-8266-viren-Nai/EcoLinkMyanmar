"use server";

import { getCurrentUser } from "@/lib/auth";
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

  const user = await getCurrentUser();

  return {
    ok: true,
    data: {
      email: parsed.data.email,
      materialType: parsed.data.materialType,
      pickupWindow: parsed.data.pickupWindow,
      submittedByUserId: user?.id ?? null,
    },
    message:
      "Thanks. This example action validated your recycling intent and is ready to connect to Supabase.",
  };
}
