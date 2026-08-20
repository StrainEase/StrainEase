import { AppHeader, AppTabBar } from "@/components/home/AppHeader";
import { HomeScreen } from "@/components/home/HomeScreen";
import { Seo } from "@/components/Seo";
import { SITE_DESCRIPTION, documentTitle } from "@/lib/site";
import { motion } from "framer-motion";

export default function Home() {
  return (
    <main className="min-h-[100dvh] bg-background pb-24 text-foreground sm:pb-10">
      <Seo
        title={documentTitle("Home")}
        description={SITE_DESCRIPTION}
        path="/"
      />
      <div aria-hidden className="page-bg" />
      <AppHeader active="home" />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.32, 0.72, 0, 1] }}
        className="mx-auto w-full max-w-6xl px-6 py-8 sm:py-10"
      >
        <HomeScreen />
      </motion.div>
      <AppTabBar active="home" />
    </main>
  );
}