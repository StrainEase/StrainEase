import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MeshBackground } from "@/components/theme/MeshBackground";
import { AlertTriangle, ChevronDown, RotateCw } from "lucide-react";
import { motion } from "framer-motion";
import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
  detailsOpen: boolean;
}

/**
 * Last-resort boundary that wraps the entire app. Catches render-time
 * crashes that escape the inner `InstrumentationProvider` and renders a
 * friendly fallback so users see something useful instead of a blank
 * screen. The error is logged to `console.error`; no production
 * telemetry is sent (see AGENTS.md "Error detection").
 *
 * If the user clicks "Reload page" we do a full reload (so the broken
 * state is wiped). "Go home" navigates via the History API and asks
 * the boundary to forget the error so the app re-renders.
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null, detailsOpen: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error, detailsOpen: false };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Single, structured log entry. We intentionally do not ship this
    // to any third-party service.
    console.error("[ErrorBoundary] render error", {
      message: error.message,
      stack: error.stack,
      componentStack: info.componentStack,
    });
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  private handleGoHome = (): void => {
    this.setState({ error: null });
    window.history.replaceState(null, "", "/");
    // A full reload guarantees any in-memory broken state is wiped.
    window.location.reload();
  };

  private toggleDetails = (): void => {
    this.setState((prev) => ({ detailsOpen: !prev.detailsOpen }));
  };

  render(): ReactNode {
    const { error, detailsOpen } = this.state;
    if (error === null) return this.props.children;

    return (
      <div className="relative isolate flex min-h-[100dvh] items-center justify-center bg-background px-4">
        <MeshBackground />
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="w-full max-w-md"
        >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-full border border-destructive/40 text-destructive">
                  <AlertTriangle className="size-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <CardTitle className="text-lg">
                    Something went wrong
                  </CardTitle>
                  <CardDescription>
                    The page hit an unexpected error and can&rsquo;t recover on
                    its own.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                Reloading usually clears it. If it keeps happening, drop us a
                note from the home page and we&rsquo;ll dig in.
              </p>
              {error.message ? (
                <p className="rounded-md border bg-muted/40 px-3 py-2 font-mono text-xs text-foreground">
                  {error.message}
                </p>
              ) : null}
            </CardContent>
            <CardFooter className="flex flex-col gap-2 sm:flex-row">
              <Button onClick={this.handleReload} className="w-full sm:w-auto">
                <RotateCw className="size-4" aria-hidden="true" />
                Reload page
              </Button>
              <Button
                onClick={this.handleGoHome}
                variant="outline"
                className="w-full sm:w-auto"
              >
                Go home
              </Button>
            </CardFooter>
            {error.stack ? (
              <div className="border-t px-6 py-3">
                <button
                  type="button"
                  onClick={this.toggleDetails}
                  className="flex w-full items-center justify-between text-xs font-medium text-muted-foreground hover:text-foreground"
                  aria-expanded={detailsOpen}
                >
                  <span>Show error details</span>
                  <ChevronDown
                    className={`size-4 transition-transform ${
                      detailsOpen ? "rotate-180" : ""
                    }`}
                    aria-hidden="true"
                  />
                </button>
                {detailsOpen ? (
                  <pre className="mt-2 max-h-60 overflow-auto rounded-md border bg-muted/40 p-3 text-[11px] leading-snug text-foreground">
                    {error.stack}
                  </pre>
                ) : null}
              </div>
            ) : null}
          </Card>
        </motion.div>
      </div>
    );
  }
}
