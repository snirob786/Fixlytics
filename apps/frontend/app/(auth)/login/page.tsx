"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { SiteHeader } from "@/components/site-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api-client";
import { authLogin } from "@/lib/backend-api";

export default function LoginPage() {
  const { login, user, ready, hydrated } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (ready && hydrated && user) {
      router.replace("/dashboard");
    }
  }, [ready, hydrated, user, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const data = await authLogin({ email, password });
      login(data);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader
        right={
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">Home</Link>
          </Button>
        }
      />
      <main className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-12">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/4 top-1/3 h-64 w-64 -translate-x-1/2 rounded-full bg-primary/15 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-1/4 right-0 h-72 w-72 translate-x-1/3 rounded-full bg-cyan-500/12 blur-3xl dark:bg-cyan-400/10"
        />
        <Card className="relative w-full max-w-md border-border/70 shadow-xl shadow-black/[0.08] dark:shadow-black/40">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-semibold tracking-tight">Sign in</CardTitle>
            <CardDescription>Use your email and password to continue.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              {error ? (
                <Alert variant="destructive">
                  <AlertTitle>Could not sign in</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? "Signing in…" : "Sign in"}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col gap-2 border-t border-border/60 bg-muted/30 px-6 py-4 text-center text-sm text-muted-foreground">
            <p>
              No account?{" "}
              <Link href="/register" className="font-medium text-foreground underline-offset-4 hover:underline">
                Create one
              </Link>
            </p>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}
