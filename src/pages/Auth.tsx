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
  signInWithEmailAndPassword,
} from "firebase/auth";
import { signInWithApple } from "@/lib/apple-auth";
import { signInWithGoogle } from "@/lib/google-auth";
import { ArrowRight, Loader2, Lock, Mail } from "lucide-react";
import { Suspense, useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";

interface AuthProps {
  redirectAfterAuth?: string;
}

function resolveRedirectAfterAuth(
  returnTo: string | null,
  fallback = "/",
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
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate(redirect, { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate, redirect]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
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

  const handleAppleLogin = async () => {
    if (!auth) return;
    setAppleLoading(true);
    setError(null);
    try {
      await signInWithApple();
    } catch (err) {
      setAppleLoading(false);
      setError(appleErrorMessage(err));
    }
  };

  function appleErrorMessage(err: unknown): string {
    const code = (err as { code?: string })?.code ?? "";
    if (code === "auth/unauthorized-domain") {
      return "Apple sign-in is blocked for this domain. Add it in the Firebase console → Authentication → Settings → Authorized domains, then try again.";
    }
    if (code === "auth/operation-not-allowed") {
      return "Apple sign-in isn't enabled for the web yet. In Firebase console → Authentication → Sign-in method → Apple, add a Services ID, Team ID, Key ID, and the .p8 key.";
    }
    if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
      return "Apple sign-in was cancelled.";
    }
    if (code === "auth/popup-blocked") {
      return "The Apple sign-in popup was blocked. Allow popups for this site and try again.";
    }
    return err instanceof Error
      ? `Apple sign-in failed: ${err.message}`
      : "Apple sign-in failed. Please try again.";
  }

  const handleGoogleLogin = async () => {
    if (!auth) return;
    setGoogleLoading(true);
    setError(null);
    try {
      // GIS direct flow: bypasses Firebase's hidden iframe, which Safari
      // breaks in two different ways (storage partitioning on redirect,
      // IndexedDB-closing on popup). GIS renders Google's UI directly and
      // returns an access token we exchange with Firebase via
      // signInWithCredential.
      await signInWithGoogle();
      // The auth-state effect above handles navigation.
    } catch (err) {
      setGoogleLoading(false);
      setError(googleErrorMessage(err));
    }
  };

  function googleErrorMessage(err: unknown): string {
    const code = (err as { code?: string })?.code ?? "";
    if (code === "auth/unauthorized-domain") {
      return "Google sign-in is blocked for this domain. Add it in the Firebase console → Authentication → Settings → Authorized domains, then try again.";
    }
    if (code === "auth/operation-not-allowed") {
      return "Google sign-in isn't enabled yet. Turn it on in the Firebase console → Authentication → Sign-in method → Google.";
    }
    return err instanceof Error
      ? `Google sign-in failed: ${err.message}`
      : "Google sign-in failed. Please try again.";
  }

  if (!isFirebaseConfigured) {
    return (
      <div className="flex min-h-[100dvh] flex-col">
        <div className="flex flex-1 items-center justify-center px-6">
          <Card className="w-full max-w-md border">
            <CardHeader className="text-center">
              <div className="flex justify-center">
                <Link to="/">
                  <img
                    src={logo}
                    alt="StrainWise logo"
                    width={64}
                    height={64}
                    className="mb-4 mt-4 rounded-lg"
                  />
                </Link>
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
    <div className="relative flex min-h-[100dvh] flex-col">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(50%_40%_at_50%_0%,oklch(0.86_0.07_158/0.35),transparent_70%)]"
      />
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="flex h-full w-full max-w-md flex-col items-center justify-center">
          <Card className="w-full border pb-0">
            <CardHeader className="text-center">
              <div className="flex justify-center">
                <Link to="/">
                  <img
                    src={logo}
                    alt="StrainWise logo"
                    width={64}
                    height={64}
                    className="mb-4 mt-4 rounded-lg"
                  />
                </Link>
              </div>
              <CardTitle className="text-xl tracking-tight">Welcome to StrainWise</CardTitle>
              <CardDescription>
                Sign in to compare strains, save your favorites, and keep
                private notes
              </CardDescription>
            </CardHeader>

            <div className="space-y-2 px-6">
              <Button
                type="button"
                className="w-full cursor-pointer bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
                onClick={handleAppleLogin}
                disabled={appleLoading || googleLoading}
              >
                {appleLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    className="mr-2 h-4 w-4 shrink-0"
                    aria-hidden="true"
                    fill="currentColor"
                  >
                    <path d="M16.365 1.43c0 1.14-.45 2.23-1.235 3.05-.87.92-2.31 1.64-3.5 1.53-.15-1.1.4-2.28 1.2-3.08.87-.87 2.4-1.5 3.535-1.5zM20.5 17.36c-.64 1.48-.95 2.14-1.78 3.45-1.16 1.82-2.8 4.09-4.83 4.11-1.8.02-2.27-1.18-4.72-1.16-2.46.01-2.97 1.19-4.78 1.17-2.03-.02-3.58-2.07-4.74-3.88-3.24-5.08-3.58-11.04-1.58-14.2 1.42-2.25 3.67-3.57 5.79-3.57 2.15 0 3.5 1.18 5.28 1.18 1.73 0 2.78-1.19 5.27-1.19 1.88 0 3.87 1.03 5.29 2.8-4.65 2.55-3.9 9.2.8 11.29z" />
                  </svg>
                )}
                Continue with Apple
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full cursor-pointer"
                onClick={handleGoogleLogin}
                disabled={googleLoading || appleLoading}
              >
                {googleLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    className="mr-2 h-4 w-4 shrink-0"
                    aria-hidden="true"
                  >
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                )}
                Continue with Google
              </Button>
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or sign in with email
                  </span>
                </div>
              </div>
            </div>

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
                      ? "bg-primary text-primary-foreground"
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
    <Suspense
      fallback={
        <div className="flex min-h-[100dvh] items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <Auth {...props} />
    </Suspense>
  );
}
