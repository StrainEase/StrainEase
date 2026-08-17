import '@vly-ai/integrations';
import { Toaster } from "@/components/ui/sonner";
import { RequireAuth } from "@/components/RequireAuth";
import { AgeGate } from "@/components/compliance/AgeGate";
import { VlyToolbar } from "../vly-toolbar-readonly.tsx";
import { InstrumentationProvider } from "@/instrumentation.tsx";
import { StrictMode, useEffect, lazy, Suspense } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useDismissKeyboardOnOutsideTap } from "@/hooks/use-dismiss-keyboard";
import { createRoot } from "react-dom/client";
import { Loader2 } from "lucide-react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router";
import "./index.css";
import "./types/global.d.ts";

const Landing = lazy(() => import("./pages/Landing.tsx"));
const Home = lazy(() => import("./pages/Home.tsx"));
const Browse = lazy(() => import("./pages/Browse.tsx"));
const AuthPage = lazy(() => import("./pages/Auth.tsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.tsx"));
const StrainPage = lazy(() => import("./pages/Strain.tsx"));
const TerpenePage = lazy(() => import("./pages/Terpene.tsx"));
const DoctorsPage = lazy(() => import("./pages/Doctors.tsx"));
const LegalPage = lazy(() => import("./pages/Legal.tsx"));
const TermsPage = lazy(() => import("./pages/Terms.tsx"));
const PrivacyPage = lazy(() => import("./pages/Privacy.tsx"));
const MedicalDisclaimerPage = lazy(
  () => import("./pages/MedicalDisclaimer.tsx"),
);
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

function RouteLoading() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
      <span className="sr-only">Loading</span>
    </div>
  );
}

function RootPage() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <RouteLoading />;
  // Logged-in users get the iOS-style home; guests keep the marketing landing.
  return isAuthenticated ? <Home /> : <Landing />;
}

function RouteSyncer() {
  const location = useLocation();
  useEffect(() => {
    window.parent.postMessage(
      { type: "iframe-route-change", path: location.pathname },
      "*",
    );
  }, [location.pathname]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "navigate") {
        if (event.data.direction === "back") window.history.back();
        if (event.data.direction === "forward") window.history.forward();
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return null;
}

function KeyboardDismiss() {
  useDismissKeyboardOnOutsideTap();
  return null;
}


createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <VlyToolbar />
    <InstrumentationProvider>
      <BrowserRouter>
        <RouteSyncer />
        <KeyboardDismiss />
        <AgeGate>
          <Suspense fallback={<RouteLoading />}>
            <Routes>
              <Route path="/" element={<RootPage />} />
              <Route
                path="/auth"
                element={<AuthPage redirectAfterAuth="/" />}
              />
              <Route
                path="/browse/:section/:ailment"
                element={
                  <RequireAuth>
                    <Browse />
                  </RequireAuth>
                }
              />
              <Route
                path="/browse/:section"
                element={
                  <RequireAuth>
                    <Browse />
                  </RequireAuth>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <RequireAuth>
                    <Dashboard />
                  </RequireAuth>
                }
              />
              <Route path="/find/:rid" element={<Dashboard />} />
              <Route path="/compare/:rid" element={<Dashboard />} />
              <Route
                path="/strain/:slug"
                element={
                  <RequireAuth>
                    <StrainPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/terpene/:slug"
                element={
                  <RequireAuth>
                    <TerpenePage />
                  </RequireAuth>
                }
              />
              <Route
                path="/doctors"
                element={
                  <RequireAuth>
                    <DoctorsPage />
                  </RequireAuth>
                }
              />
              <Route path="/legal" element={<LegalPage />} />
              <Route path="/legal/terms" element={<TermsPage />} />
              <Route path="/legal/privacy" element={<PrivacyPage />} />
              <Route
                path="/legal/medical"
                element={<MedicalDisclaimerPage />}
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AgeGate>
      </BrowserRouter>
      <Toaster />
    </InstrumentationProvider>
  </StrictMode>,
);
