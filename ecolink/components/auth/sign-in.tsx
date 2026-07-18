"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { LogIn } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase-client";

export function EcoLinkSignIn() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setIsSubmitting(true);

    const supabase = createSupabaseBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setIsSubmitting(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }

    router.replace(searchParams.get("redirect_url") ?? "/");
    router.refresh();
  }

  return (
    <Card className="w-full max-w-sm" variant="outlined">
      <CardContent>
        <Stack component="form" spacing={2} onSubmit={signIn}>
          <h2 className="text-xl font-bold text-secondary">Sign in to EcoLink</h2>
          <TextField
            autoComplete="email"
            label="Email"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
            variant="filled"
          />
          <TextField
            autoComplete="current-password"
            label="Password"
            onChange={(event) => setPassword(event.target.value)}
            required
            slotProps={{ htmlInput: { minLength: 8 } }}
            type="password"
            value={password}
            variant="filled"
          />
          {error ? <Alert severity="error">{error}</Alert> : null}
          <Button
            disabled={isSubmitting}
            startIcon={isSubmitting ? <CircularProgress color="inherit" size={16} /> : <LogIn aria-hidden="true" size={18} />}
            type="submit"
            variant="contained"
          >
            {isSubmitting ? "Signing in" : "Sign in"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            New to EcoLink? <Link className="inline-flex min-h-11 items-center font-medium text-primary underline-offset-4 hover:underline" href="/sign-up">Create an account</Link>
          </p>
        </Stack>
      </CardContent>
    </Card>
  );
}
