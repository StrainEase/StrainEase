import { AppHeader, AppTabBar } from "@/components/home/AppHeader";
import { HomeScreen } from "@/components/home/HomeScreen";
import { Seo } from "@/components/Seo";
import { MeshBackground } from "@/components/theme/MeshBackground";
import { SITE_DESCRIPTION, documentTitle } from "@/lib/site";
import { motion, useReducedMotion } from "framer-motion";

export default function Home() {
  // Respect the OS-level "reduce motion" preference. The CSS side already
  // handles tilt / shimmer / sign-in glow; this skips the page entrance
  // animation so the content snaps in for users who get motion sick from
  // large translateY entrances.
  const reduce = useReducedMotion();
  return (
    <main className="relative isolate min-h-[100dvh] bg-background pb-24 text-foreground sm:pb-10">
      <Seo
        title={documentTitle("Home")}
        description={SITE_DESCRIPTION}
        path="/"
      />
      <MeshBackground />
      <AppHeader active="home" />
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={
          reduce
            ? { duration: 0 }
            : { duration: 0.55, ease: [0.32, 0.72, 0, 1] }
        }
        className="mx-auto w-full max-w-6xl px-6 py-8 sm:py-10"
      >
        <HomeScreen />
      </motion.div>
      <AppTabBar active="home" />
    </main>
  );
}