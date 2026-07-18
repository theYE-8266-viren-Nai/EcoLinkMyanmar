"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase-client";

export function EcoLinkSignUp() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function signUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setMessage(undefined);
    setIsSubmitting(true);

    const supabase = createSupabaseBrowserClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: displayName.trim() },
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
      },
    });

    setIsSubmitting(false);
    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    if (data.session) {
      router.replace("/");
      router.refresh();
      return;
    }

    setMessage("Check your email to confirm your EcoLink account.");
  }

  return (
    <Card className="w-full max-w-sm" variant="outlined">
      <CardContent>
        <Stack component="form" spacing={2} onSubmit={signUp}>
          <h2 className="text-xl font-bold text-secondary">Create your EcoLink account</h2>
          <TextField
            autoComplete="name"
            label="Name"
            onChange={(event) => setDisplayName(event.target.value)}
            required
            value={displayName}
            variant="filled"
          />
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
            autoComplete="new-password"
            label="Password"
            onChange={(event) => setPassword(event.target.value)}
            required
            slotProps={{ htmlInput: { minLength: 8 } }}
            type="password"
            value={password}
            variant="filled"
          />
          {error ? <Alert severity="error">{error}</Alert> : null}
          {message ? <Alert severity="success">{message}</Alert> : null}
          <Button
            disabled={isSubmitting}
            startIcon={isSubmitting ? <CircularProgress color="inherit" size={16} /> : <UserPlus aria-hidden="true" size={18} />}
            type="submit"
            variant="contained"
          >
            {isSubmitting ? "Creating account" : "Create account"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Already have an account? <Link className="inline-flex min-h-11 items-center font-medium text-primary underline-offset-4 hover:underline" href="/sign-in">Sign in</Link>
          </p>
        </Stack>
      </CardContent>
    </Card>
  );
}
