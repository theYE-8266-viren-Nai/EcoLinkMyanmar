"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { authTextFieldSx } from "@/components/auth/auth-field-styles";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";
import { sanitizeErrorMessage } from "@/lib/errors";
import { useI18n } from "@/lib/i18n";

export function EcoLinkSignUp() {
  const { t } = useI18n();
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
      setError(sanitizeErrorMessage(signUpError.message, "Failed to create account. Please try again."));
      return;
    }

    if (data.session) {
      router.replace("/");
      router.refresh();
      return;
    }

    setMessage(t("auth.checkEmail"));
  }

  return (
    <Stack component="form" spacing={2} onSubmit={signUp} sx={{ width: "100%" }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "secondary.main" }}>
        {t("auth.createTitle")}
      </Typography>
      <TextField
        autoComplete="name"
        label={t("auth.name")}
        onChange={(event) => setDisplayName(event.target.value)}
        required
        sx={authTextFieldSx}
        value={displayName}
        variant="filled"
      />
      <TextField
        autoComplete="email"
        label={t("auth.email")}
        onChange={(event) => setEmail(event.target.value)}
        required
        sx={authTextFieldSx}
        type="email"
        value={email}
        variant="filled"
      />
      <TextField
        autoComplete="new-password"
        label={t("auth.password")}
        onChange={(event) => setPassword(event.target.value)}
        required
        slotProps={{ htmlInput: { minLength: 8 } }}
        sx={authTextFieldSx}
        type="password"
        value={password}
        variant="filled"
      />
      {error && <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>}
      {message && <Alert severity="success" sx={{ borderRadius: 2 }}>{message}</Alert>}
      <Button
        disabled={isSubmitting}
        startIcon={isSubmitting ? <CircularProgress color="inherit" size={16} /> : <UserPlus aria-hidden="true" size={18} />}
        type="submit"
        variant="contained"
        size="large"
      >
        {isSubmitting ? t("auth.creating") : t("auth.createShort")}
      </Button>
      <Typography variant="body2" align="center" color="text.secondary">
        {t("auth.already")}{" "}
        <Link style={{ color: "#087c78", fontWeight: 700, textDecoration: "none" }} href="/sign-in">
          {t("shell.signIn")}
        </Link>
      </Typography>
    </Stack>
  );
}
