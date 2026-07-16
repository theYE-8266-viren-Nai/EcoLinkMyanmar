"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { Recycle } from "lucide-react";
import { useState, useTransition, type ReactNode } from "react";
import { useForm } from "react-hook-form";

import { submitRecyclingIntentAction } from "@/actions/recycling-intent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMounted } from "@/hooks/use-mounted";
import {
  recyclingIntentSchema,
  type RecyclingIntentInput,
} from "@/schemas/recycling-intent";

export function RecyclingIntentForm() {
  const mounted = useMounted();
  const [isPending, startTransition] = useTransition();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const form = useForm<RecyclingIntentInput>({
    resolver: zodResolver(recyclingIntentSchema),
    defaultValues: {
      name: "",
      email: "",
      materialType: "",
      pickupWindow: "Weekday morning",
      notes: "",
    },
  });

  function onSubmit(values: RecyclingIntentInput) {
    setStatusMessage(null);

    startTransition(async () => {
      const result = await submitRecyclingIntentAction(values);

      if (!result.ok) {
        setStatusMessage(result.message);
        return;
      }

      setStatusMessage(
        `${result.message} Preferred pickup: ${result.data.pickupWindow}.`,
      );
      form.reset();
    });
  }

  return (
    <motion.form
      animate={mounted ? { opacity: 1, y: 0 } : false}
      className="w-full max-w-xl space-y-4 rounded-xl border bg-card p-6 shadow-sm"
      initial={{ opacity: 0, y: 12 }}
      onSubmit={form.handleSubmit(onSubmit)}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <div className="flex items-start gap-3">
        <span className="rounded-lg bg-primary/10 p-2 text-primary">
          <Recycle aria-hidden="true" className="size-5" />
        </span>
        <div>
          <h2 className="text-lg font-semibold">Recycling intent example</h2>
          <p className="text-sm text-muted-foreground">
            A starter RHF + Zod form connected to a typed Server Action.
          </p>
        </div>
      </div>

      <Field
        error={form.formState.errors.name?.message}
        htmlFor="name"
        label="Name"
      >
        <Input id="name" autoComplete="name" {...form.register("name")} />
      </Field>

      <Field
        error={form.formState.errors.email?.message}
        htmlFor="email"
        label="Email"
      >
        <Input
          id="email"
          type="email"
          autoComplete="email"
          {...form.register("email")}
        />
      </Field>

      <Field
        error={form.formState.errors.materialType?.message}
        htmlFor="materialType"
        label="Material type"
      >
        <Input
          id="materialType"
          placeholder="Plastic bottles, paper, aluminum cans"
          {...form.register("materialType")}
        />
      </Field>

      <Field
        error={form.formState.errors.pickupWindow?.message}
        htmlFor="pickupWindow"
        label="Preferred pickup window"
      >
        <Input id="pickupWindow" {...form.register("pickupWindow")} />
      </Field>

      <Field
        error={form.formState.errors.notes?.message}
        htmlFor="notes"
        label="Notes"
      >
        <Input
          id="notes"
          placeholder="Optional preparation or access details"
          {...form.register("notes")}
        />
      </Field>

      <Button className="w-full" disabled={isPending} type="submit">
        {isPending ? "Submitting..." : "Validate recycling intent"}
      </Button>

      {statusMessage ? (
        <p className="rounded-lg bg-muted px-3 py-2 text-sm" role="status">
          {statusMessage}
        </p>
      ) : null}
    </motion.form>
  );
}

function Field({
  children,
  error,
  htmlFor,
  label,
}: {
  children: ReactNode;
  error?: string;
  htmlFor: string;
  label: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
