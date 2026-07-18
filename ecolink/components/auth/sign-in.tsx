"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { LogIn } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase-client";
import { sanitizeErrorMessage } from "@/lib/errors";

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
      setError(sanitizeErrorMessage(signInError.message, "Failed to sign in. Please check your credentials and try again."));
      return;
    }

    router.replace(searchParams.get("redirect_url") ?? "/");
    router.refresh();
  }

  return (
    <Stack component="form" spacing={2.5} onSubmit={signIn} sx={{ width: "100%" }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "secondary.main" }}>
        Sign in to EcoLink
      </Typography>
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
      {error && <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>}
      <Button
        disabled={isSubmitting}
        startIcon={isSubmitting ? <CircularProgress color="inherit" size={16} /> : <LogIn aria-hidden="true" size={18} />}
        type="submit"
        variant="contained"
        size="large"
      >
        {isSubmitting ? "Signing in" : "Sign in"}
      </Button>
      <Typography variant="body2" align="center" color="text.secondary">
        New to EcoLink?{" "}
        <Link style={{ color: "#087c78", fontWeight: 700, textDecoration: "none" }} href="/sign-up">
          Create an account
        </Link>
      </Typography>
    </Stack>
  );
}
