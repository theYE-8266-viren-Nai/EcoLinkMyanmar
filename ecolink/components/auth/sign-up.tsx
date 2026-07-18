"use client";

import { UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Create a Supabase account</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={signUp}>
          <label className="grid gap-1.5 text-sm font-medium">
            <span>Name</span>
            <Input autoComplete="name" onChange={(event) => setDisplayName(event.target.value)} required value={displayName} />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            <span>Email</span>
            <Input autoComplete="email" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            <span>Password</span>
            <Input autoComplete="new-password" minLength={8} onChange={(event) => setPassword(event.target.value)} required type="password" value={password} />
          </label>
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          {message ? <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800" role="status">{message}</p> : null}
          <Button disabled={isSubmitting} type="submit">
            <UserPlus aria-hidden="true" />
            {isSubmitting ? "Creating account" : "Create account"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Already have an account? <Link className="font-medium text-primary underline-offset-4 hover:underline" href="/sign-in">Sign in</Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
