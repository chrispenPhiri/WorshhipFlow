import { FormEvent, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Lock, ShieldCheck, UserPlus, LogIn, Info } from "lucide-react";
import { useAuth } from "@/lib/auth/context";
import { validatePassword, validateUsername } from "@/lib/auth/store";

export default function AuthPage() {
  const { hasAnyUsers, signup, login } = useAuth();
  const defaultTab = hasAnyUsers ? "login" : "signup";
  const [tab, setTab] = useState<string>(defaultTab);

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-4 bg-background text-foreground dark">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto bg-primary text-primary-foreground rounded-md w-12 h-12 flex items-center justify-center font-bold">
            PW
          </div>
          <CardTitle className="text-2xl">Phiri WorshipFlow</CardTitle>
          <CardDescription>
            {hasAnyUsers
              ? "Sign in to continue"
              : "Create your first account on this device"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="login" data-testid="tab-login">
                <LogIn className="w-4 h-4 mr-2" /> Sign in
              </TabsTrigger>
              <TabsTrigger value="signup" data-testid="tab-signup">
                <UserPlus className="w-4 h-4 mr-2" /> Create account
              </TabsTrigger>
            </TabsList>
            <TabsContent value="login" className="mt-4">
              <LoginForm onSubmit={login} />
            </TabsContent>
            <TabsContent value="signup" className="mt-4">
              <SignupForm onSubmit={signup} />
            </TabsContent>
          </Tabs>

          <div className="rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground flex gap-2">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
            <div>
              <span className="font-medium text-foreground">Local accounts only.</span>{" "}
              Your username and password are stored on this device and never sent
              anywhere. Each browser keeps its own account list — installing the
              app on a phone or another browser starts fresh.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function LoginForm({
  onSubmit,
}: {
  onSubmit: (input: { username: string; password: string }) => Promise<void>;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handle(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await onSubmit({ username: username.trim(), password });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handle} className="space-y-3" data-testid="form-login">
      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor="login-username">Username</label>
        <Input
          id="login-username"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          data-testid="input-login-username"
          autoFocus
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor="login-password">Password</label>
        <Input
          id="login-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          data-testid="input-login-password"
        />
      </div>
      {error && (
        <div
          className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded px-3 py-2"
          data-testid="login-error"
        >
          {error}
        </div>
      )}
      <Button type="submit" className="w-full" disabled={busy} data-testid="button-submit-login">
        <Lock className="w-4 h-4 mr-2" />
        {busy ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}

function SignupForm({
  onSubmit,
}: {
  onSubmit: (input: {
    username: string;
    password: string;
    displayName?: string;
  }) => Promise<void>;
}) {
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handle(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const u = validateUsername(username.trim());
    if (u) return setError(u);
    const p = validatePassword(password);
    if (p) return setError(p);
    if (password !== confirm) return setError("Passwords do not match.");
    setBusy(true);
    try {
      await onSubmit({
        username: username.trim(),
        password,
        displayName: displayName.trim() || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create account.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handle} className="space-y-3" data-testid="form-signup">
      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor="signup-username">Username *</label>
        <Input
          id="signup-username"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="e.g. pastor.john"
          data-testid="input-signup-username"
          autoFocus
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor="signup-display">Display name (optional)</label>
        <Input
          id="signup-display"
          autoComplete="name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="John Phiri"
          data-testid="input-signup-display"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor="signup-password">Password *</label>
        <Input
          id="signup-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          data-testid="input-signup-password"
        />
        <p className="text-[11px] text-muted-foreground">At least 6 characters.</p>
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor="signup-confirm">Confirm password *</label>
        <Input
          id="signup-confirm"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          data-testid="input-signup-confirm"
        />
      </div>
      {error && (
        <div
          className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded px-3 py-2"
          data-testid="signup-error"
        >
          {error}
        </div>
      )}
      <Button type="submit" className="w-full" disabled={busy} data-testid="button-submit-signup">
        <ShieldCheck className="w-4 h-4 mr-2" />
        {busy ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
