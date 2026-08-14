import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { auth, isFirebaseConfigured } from "@/lib/firebase";
import logo from "@/assets/logo.svg";
import {
  createUserWithEmailAndPassword,
  signInAnonymously,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { ArrowRight, Loader2, Lock, Mail, UserX } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";

interface AuthProps {
  redirectAfterAuth?: string;
}

function resolveRedirectAfterAuth(
  returnTo: string | null,
  fallback = "/dashboard",
) {
  if (returnTo?.startsWith("/") && !returnTo.startsWith("//")) {
    return returnTo;
  }
  return fallback;
}

function Auth({ redirectAfterAuth }: AuthProps = {}) {
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = resolveRedirectAfterAuth(
    searchParams.get("returnTo"),
    redirectAfterAuth,
  );

  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate(redirect);
    }
  }, [authLoading, isAuthenticated, navigate, redirect]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!auth) return;
    setIsLoading(true);
    setError(null);
    try {
      if (mode === "signUp") {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      // The auth-state effect above handles navigation.
    } catch (err) {
      const code = (err as { code?: string })?.code ?? "";
      setError(
        code === "auth/email-already-in-use"
          ? "An account already exists for that email — sign in instead."
          : code === "auth/wrong-password" || code === "auth/invalid-credential"
            ? "Incorrect email or password."
          : code === "auth/user-not-found"
            ? "No account found for that email — create one instead."
            : err instanceof Error
              ? err.message
              : "Something went wrong. Please try again.",
      );
      setIsLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    if (!auth) return;
    setIsLoading(true);
    setError(null);
    try {
      await signInAnonymously(auth);
    } catch (err) {
      setError(
        err instanceof Error
          ? `Guest sign-in failed: ${err.message}`
          : "Guest sign-in failed. Please try again.",
      );
      setIsLoading(false);
    }
  };

  if (!isFirebaseConfigured) {
    return (
      <div className="flex min-h-screen flex-col">
        <div className="flex flex-1 items-center justify-center px-6">
          <Card className="w-full max-w-md border shadow-md">
            <CardHeader className="text-center">
              <div className="flex justify-center">
                <img
                  src={logo}
                  alt="StrainWise logo"
                  width={64}
                  height={64}
                  className="mb-4 mt-4 cursor-pointer rounded-lg"
                  onClick={() => navigate("/")}
                />
              </div>
              <CardTitle className="text-xl">Almost there</CardTitle>
              <CardDescription>
                StrainWise saves your strains and notes with Firebase. Add your
                Firebase project keys in the Keys/API keys tab to enable
                accounts:
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border border-border/70 bg-muted/50 px-4 py-3 font-mono text-xs leading-6 text-muted-foreground">
                VITE_FIREBASE_API_KEY
                <br />
                VITE_FIREBASE_AUTH_DOMAIN
                <br />
                VITE_FIREBASE_PROJECT_ID
                <br />
                VITE_FIREBASE_APP_ID
              </div>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                You can still browse popular strains and run comparisons in the
                meantime — only saving and notes need Firebase.
              </p>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full cursor-pointer"
                variant="outline"
                onClick={() => navigate("/")}
              >
                Back to homepage
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex flex-1 items-center justify-center">
        <div className="flex h-full flex-col items-center justify-center">
          <Card className="min-w-[350px] border pb-0 shadow-md">
            <CardHeader className="text-center">
              <div className="flex justify-center">
                <img
                  src={logo}
                  alt="StrainWise logo"
                  width={64}
                  height={64}
                  className="mb-4 mt-4 cursor-pointer rounded-lg"
                  onClick={() => navigate("/")}
                />
              </div>
              <CardTitle className="text-xl">Welcome to StrainWise</CardTitle>
              <CardDescription>
                Sign in to compare strains, save your favorites, and keep
                private notes
              </CardDescription>
            </CardHeader>

            <div className="mx-6 mb-4 flex rounded-full border border-border/70 bg-muted/50 p-1">
              {(["signIn", "signUp"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setMode(m);
                    setError(null);
                  }}
                  className={`flex-1 cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                    mode === m
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {m === "signIn" ? "Sign in" : "Create account"}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-3">
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="name@example.com"
                    className="pl-9"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="password"
                    placeholder={mode === "signUp" ? "Create a password (6+ characters)" : "Password"}
                    className="pl-9"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    minLength={6}
                    required
                  />
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
                <Button
                  type="submit"
                  className="w-full cursor-pointer rounded-full"
                  disabled={isLoading || email === "" || password.length < 6}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {mode === "signUp" ? "Creating account…" : "Signing in…"}
                    </>
                  ) : (
                    <>
                      {mode === "signUp" ? "Create account" : "Sign in"}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </CardContent>
            </form>

            <div className="px-6 pb-5">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or
                  </span>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                className="mt-4 w-full cursor-pointer"
                onClick={handleGuestLogin}
                disabled={isLoading}
              >
                <UserX className="mr-2 h-4 w-4" />
                Continue as guest
              </Button>
            </div>

            <div className="rounded-b-lg border-t bg-muted px-6 py-4 text-center text-xs text-muted-foreground">
              For medical use only · Not medical advice · Secured by{" "}
              <a
                href="https://firebase.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline transition-colors hover:text-primary"
              >
                Firebase
              </a>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage(props: AuthProps) {
  return (
    <Suspense>
      <Auth {...props} />
    </Suspense>
  );
}
