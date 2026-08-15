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
import { auth, googleClientId, isFirebaseConfigured } from "@/lib/firebase";
import logo from "@/assets/logo.svg";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithCredential,
  signInWithEmailAndPassword,
} from "firebase/auth";
import {
  initGoogleSignIn,
  loadGisScript,
  mountGoogleButton,
} from "@/lib/google-auth";
import { ArrowRight, Loader2, Lock, Mail } from "lucide-react";
import {
  Suspense,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { Link, useNavigate, useSearchParams } from "react-router";

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
  const [error, setError] = useState<string | null>(null);
  const googleButtonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate(redirect, { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate, redirect]);

  // Mount the Google Sign-In button once the GIS script is loaded. The
  // callback wires the resulting ID token to Firebase via
  // signInWithCredential. The auth-state effect above handles navigation.
  useEffect(() => {
    if (!googleButtonRef.current) return;
    if (!googleClientId) return;
    let cleanup: (() => void) | null = null;
    let cancelled = false;
    loadGisScript()
      .then(() => {
        if (cancelled || !googleButtonRef.current) return;
        initGoogleSignIn((idToken) => {
          if (!auth) return;
          setGoogleLoading(true);
          setError(null);
          const credential = GoogleAuthProvider.credential(idToken);
          signInWithCredential(auth, credential).catch((err) => {
            setGoogleLoading(false);
            setError(googleErrorMessage(err));
          });
        });
        cleanup = mountGoogleButton(googleButtonRef.current);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);

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

            <div className="px-6">
              {/* Google Identity Services renders its own official
                  "Sign In With Google" button inside this div. The host
                  width is constrained to match the surrounding form. */}
              <div
                ref={googleButtonRef}
                className="flex w-full justify-center"
                aria-busy={googleLoading}
              />
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
