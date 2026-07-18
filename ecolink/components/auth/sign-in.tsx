"use client";

import { LogIn } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Sign in with Supabase</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={signIn}>
          <label className="grid gap-1.5 text-sm font-medium">
            <span>Email</span>
            <Input autoComplete="email" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            <span>Password</span>
            <Input autoComplete="current-password" minLength={8} onChange={(event) => setPassword(event.target.value)} required type="password" value={password} />
          </label>
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          <Button disabled={isSubmitting} type="submit">
            <LogIn aria-hidden="true" />
            {isSubmitting ? "Signing in" : "Sign in"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            New to EcoLink? <Link className="font-medium text-primary underline-offset-4 hover:underline" href="/sign-up">Create an account</Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
