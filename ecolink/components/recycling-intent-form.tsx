"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { motion } from "framer-motion";
import { Recycle } from "lucide-react";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { submitRecyclingIntentAction } from "@/actions/recycling-intent";
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
      className="w-full max-w-xl"
      initial={{ opacity: 0, y: 12 }}
      onSubmit={form.handleSubmit(onSubmit)}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <Card variant="outlined">
        <CardContent>
          <Stack spacing={2.25}>
            <div className="flex items-start gap-3">
              <span className="rounded-lg bg-primary/10 p-2 text-primary">
                <Recycle aria-hidden="true" className="size-5" />
              </span>
              <div>
                <h2 className="text-lg font-semibold">Plan a recycling pickup</h2>
                <p className="text-sm text-muted-foreground">
                  Tell us what you want to recycle and when collection works best.
                </p>
              </div>
            </div>

            <TextField
              autoComplete="name"
              error={Boolean(form.formState.errors.name)}
              helperText={form.formState.errors.name?.message}
              id="name"
              label="Name"
              {...form.register("name")}
            />

            <TextField
              autoComplete="email"
              error={Boolean(form.formState.errors.email)}
              helperText={form.formState.errors.email?.message}
              id="email"
              label="Email"
              type="email"
              {...form.register("email")}
            />

            <TextField
              error={Boolean(form.formState.errors.materialType)}
              helperText={form.formState.errors.materialType?.message}
              id="materialType"
              label="Material type"
              placeholder="Plastic bottles, paper, aluminum cans"
              {...form.register("materialType")}
            />

            <TextField
              error={Boolean(form.formState.errors.pickupWindow)}
              helperText={form.formState.errors.pickupWindow?.message}
              id="pickupWindow"
              label="Preferred pickup window"
              {...form.register("pickupWindow")}
            />

            <TextField
              error={Boolean(form.formState.errors.notes)}
              helperText={form.formState.errors.notes?.message}
              id="notes"
              label="Notes"
              placeholder="Gate code, pickup spot, or sorting notes"
              {...form.register("notes")}
            />

            <Button
              disabled={isPending}
              startIcon={isPending ? <CircularProgress color="inherit" size={16} /> : null}
              type="submit"
              variant="contained"
            >
              {isPending ? "Submitting..." : "Request pickup"}
            </Button>

            {statusMessage ? <Alert severity="info">{statusMessage}</Alert> : null}
          </Stack>
        </CardContent>
      </Card>
    </motion.form>
  );
}
