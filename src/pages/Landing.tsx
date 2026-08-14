import { motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  BookOpen,
  Brain,
  Globe,
  Leaf,
  MapPin,
  MessageCircle,
  Moon,
  Pill,
  Search,
  ShieldCheck,
  Sparkles,
  Store,
  Zap,
} from "lucide-react";
import { Link } from "react-router";
import logo from "@/assets/logo.svg";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const CONDITIONS = [
  "Chronic pain",
  "Anxiety",
  "Insomnia",
  "Depression",
  "Nausea & appetite",
  "Inflammation",
  "Migraine",
  "Muscle spasm",
  "PTSD",
  "Fatigue",
  "Arthritis",
  "Stress",
];

const SOURCES = [
  { name: "Leafly", icon: Leaf },
  { name: "Weedmaps", icon: MapPin },
  { name: "Reddit", icon: MessageCircle },
  { name: "Google", icon: Globe },
  { name: "Dispensary menus", icon: Store },
];

const FEATURED_STRAINS = [
  {
    name: "Blue Dream",
    type: "hybrid",
    thc: "17–24%",
    uses: ["Chronic pain", "Depression", "Stress"],
    terpenes: "Myrcene · Pinene · Caryophyllene",
  },
  {
    name: "Granddaddy Purple",
    type: "indica",
    thc: "17–23%",
    uses: ["Insomnia", "Chronic pain", "Muscle spasm"],
    terpenes: "Myrcene · Caryophyllene · Pinene",
  },
  {
    name: "Sour Diesel",
    type: "sativa",
    thc: "19–24%",
    uses: ["Stress", "Depression", "Chronic pain"],
    terpenes: "Caryophyllene · Limonene · Terpinolene",
  },
  {
    name: "Jack Herer",
    type: "sativa",
    thc: "18–23%",
    uses: ["Fatigue", "Depression", "ADHD focus"],
    terpenes: "Terpinolene · Pinene · Caryophyllene",
  },
  {
    name: "Gelato",
    type: "hybrid",
    thc: "20–25%",
    uses: ["Stress", "Anxiety", "Depression"],
    terpenes: "Caryophyllene · Limonene · Linalool",
  },
  {
    name: "Northern Lights",
    type: "indica",
    thc: "16–21%",
    uses: ["Insomnia", "Chronic pain", "Stress"],
    terpenes: "Myrcene · Caryophyllene · Pinene",
  },
];

const TYPE_STYLES: Record<string, string> = {
  indica: "bg-amber-500/10 text-amber-700",
  sativa: "bg-sky-500/10 text-sky-700",
  hybrid: "bg-emerald-500/10 text-emerald-700",
};

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

function fadeUp(delay: number) {
  return {
    initial: { opacity: 0, y: 16 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.2 },
    transition: { duration: 0.6, delay, ease: EASE },
    style: { willChange: "transform, opacity" },
  };
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Nav ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <img
              src={logo}
              alt="StrainWise logo"
              width={34}
              height={34}
              className="rounded-[10px]"
            />
            <span className="text-lg font-semibold tracking-tight">
              StrainWise
            </span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
            <a href="#how-it-works" className="transition-colors hover:text-foreground">
              How it works
            </a>
            <a href="#strains" className="transition-colors hover:text-foreground">
              Strains
            </a>
            <a href="#sources" className="transition-colors hover:text-foreground">
              Sources
            </a>
          </nav>
          <Button asChild size="sm" className="cursor-pointer rounded-full px-5">
            <Link to="/auth">
              Open the app
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_0%,oklch(0.93_0.04_158/0.55),transparent_70%)]"
        />
        <div className="mx-auto w-full max-w-6xl px-6 pb-20 pt-20 sm:pt-28">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
            style={{ willChange: "transform, opacity" }}
            className="mx-auto max-w-3xl text-center"
          >
            <Badge
              variant="secondary"
              className="mb-6 gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium"
            >
              <ShieldCheck className="size-3.5 text-primary" />
              Built for medical cannabis patients
            </Badge>
            <h1 className="text-4xl font-bold leading-[1.08] tracking-tight text-balance sm:text-5xl lg:text-6xl">
              Find cannabis strains{" "}
              <span className="text-primary">for the relief you need</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              Tell StrainWise what you&apos;re treating — it researches Leafly,
              Weedmaps, Reddit, Google and dispensary menus, then uses AI to
              rank the strains patients report work best for your symptoms.
              Compare the top picks side by side in seconds.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="w-full cursor-pointer rounded-full px-8 sm:w-auto">
                <Link to="/auth">
                  Find strains for me
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="w-full cursor-pointer rounded-full px-8 sm:w-auto"
              >
                <a href="#how-it-works">See how it works</a>
              </Button>
            </div>

            <div className="mt-12 flex flex-wrap items-center justify-center gap-2.5">
              <span className="mr-1 text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Sources
              </span>
              {SOURCES.map(({ name, icon: Icon }) => (
                <span
                  key={name}
                  className="flex items-center gap-1.5 rounded-full border border-border/70 bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm"
                >
                  <Icon className="size-3.5" />
                  {name}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Conditions ──────────────────────────────────────── */}
      <section className="border-y border-border/60 bg-card/60">
        <div className="mx-auto w-full max-w-6xl px-6 py-14">
          <motion.div {...fadeUp(0)} className="flex flex-col items-center gap-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              For your symptoms
            </p>
            <h2 className="max-w-xl text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
              Start with what you&apos;re treating, not the jargon
            </h2>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {CONDITIONS.map((c) => (
                <span
                  key={c}
                  className="rounded-full border border-border/70 bg-background px-4 py-1.5 text-sm text-muted-foreground shadow-sm transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  {c}
                </span>
              ))}
            </div>
            <p className="max-w-xl text-sm leading-6 text-muted-foreground">
              Pick your symptoms and StrainWise researches the strains patients
              report work best for them — then ranks the top matches so you
              can compare the finalists side by side.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────── */}
      <section id="how-it-works" className="mx-auto w-full max-w-6xl px-6 py-24">
        <motion.div {...fadeUp(0)} className="mb-14 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            How it works
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
            Three steps to the strains you need
          </h2>
        </motion.div>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              icon: Search,
              step: "01",
              title: "Tell us your symptoms",
              body: "Pick from common conditions or type any symptom — sciatica, fibromyalgia, anything that's on your mind.",
            },
            {
              icon: Pill,
              step: "02",
              title: "Get the best-fit strains",
              body: "MiniMax AI ranks the strains patients report work best for your symptoms — with reasons, best-for notes, and cautions.",
            },
            {
              icon: Brain,
              step: "03",
              title: "Compare your top picks",
              body: "Turn the finalists into a side-by-side medical comparison: differences, common ground, and what to watch out for.",
            },
          ].map((s, i) => (
            <motion.div
              key={s.step}
              {...fadeUp(i * 0.1)}
              className="group relative rounded-2xl border border-border/70 bg-card p-7 shadow-sm transition-shadow hover:shadow-md"
            >
              <span className="absolute right-6 top-6 text-3xl font-semibold text-border/80 transition-colors group-hover:text-primary/20">
                {s.step}
              </span>
              <div className="mb-5 flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <s.icon className="size-5" />
              </div>
              <h3 className="text-base font-semibold tracking-tight">{s.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{s.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Featured strains ────────────────────────────────── */}
      <section id="strains" className="border-y border-border/60 bg-card/60">
        <div className="mx-auto w-full max-w-6xl px-6 py-24">
          <motion.div {...fadeUp(0)} className="mb-12 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                The knowledge base
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
                Strains patients actually compare
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-6 text-muted-foreground">
              Every profile aggregates commonly reported effects, terpenes and
              medical uses from public sources — ready to compare.
            </p>
          </motion.div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURED_STRAINS.map((strain, i) => (
              <motion.div
                key={strain.name}
                {...fadeUp((i % 3) * 0.08)}
                className="rounded-2xl border border-border/70 bg-background p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold tracking-tight">{strain.name}</h3>
                  <Badge className={`${TYPE_STYLES[strain.type]} capitalize`}>
                    {strain.type}
                  </Badge>
                </div>
                <p className="mt-1 text-xs font-medium text-muted-foreground">
                  THC {strain.thc}
                </p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {strain.uses.map((u) => (
                    <span
                      key={u}
                      className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground"
                    >
                      {u}
                    </span>
                  ))}
                </div>
                <p className="mt-4 border-t border-border/60 pt-4 text-xs leading-5 text-muted-foreground">
                  <span className="font-medium text-foreground">Terpenes</span>{" "}
                  — {strain.terpenes}
                </p>
              </motion.div>
            ))}
          </div>
          <motion.div {...fadeUp(0.1)} className="mt-10 text-center">
            <Button asChild variant="outline" className="cursor-pointer rounded-full px-7">
              <Link to="/auth">
                <Sparkles className="size-4 text-primary" />
                Find your match
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* ── Sources ─────────────────────────────────────────── */}
      <section id="sources" className="mx-auto w-full max-w-6xl px-6 py-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <motion.div {...fadeUp(0)}>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Where the knowledge comes from
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
              One comparison, many voices
            </h2>
            <p className="mt-4 max-w-lg text-sm leading-7 text-muted-foreground sm:text-base">
              StrainWise doesn&apos;t guess. Each strain profile aggregates
              commonly reported information from the sources patients actually
              use, then our AI weighs them together for a practical,
              medical-focused verdict.
            </p>
            <ul className="mt-8 space-y-4">
              {[
                {
                  icon: Leaf,
                  title: "Leafly reviews",
                  body: "Thousands of patient ratings on effects, potency and reported uses.",
                },
                {
                  icon: MapPin,
                  title: "Weedmaps listings",
                  body: "How dispensaries describe and tag strains for medical shoppers.",
                },
                {
                  icon: MessageCircle,
                  title: "Reddit discussions",
                  body: "First-hand patient experiences in r/trees, r/medicalmarijuana and r/MMJ.",
                },
                {
                  icon: BookOpen,
                  title: "Dispensary menus & Google",
                  body: "Local availability, pricing context and the broader public record.",
                },
              ].map((s, i) => (
                <motion.li
                  key={s.title}
                  {...fadeUp(0.05 * i)}
                  className="flex items-start gap-4"
                >
                  <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-card text-primary shadow-sm">
                    <s.icon className="size-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{s.title}</p>
                    <p className="mt-0.5 text-sm leading-6 text-muted-foreground">{s.body}</p>
                  </div>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          <motion.div {...fadeUp(0.1)} className="relative">
            <div className="rounded-3xl border border-border/70 bg-card p-8 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                <Activity className="size-3.5 text-primary" />
                Sample search — insomnia
              </div>
              <h3 className="mt-4 text-xl font-semibold tracking-tight">
                Best strains for insomnia
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                What patients commonly report across our sources
              </p>
              <div className="mt-6 space-y-5">
                {[
                  {
                    label: "#1 Granddaddy Purple",
                    value: "Deep grape-scented body calm that helps ease into sleep",
                    icon: Moon,
                  },
                  {
                    label: "#2 Northern Lights",
                    value: "Smooth, heavy relaxation — a dependable sleep aid",
                    icon: Sparkles,
                  },
                  {
                    label: "#3 9 Pound Hammer",
                    value: "Strong sedation for nights when nothing else works",
                    icon: Zap,
                  },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex items-start gap-3 rounded-xl border border-border/60 bg-background p-4"
                  >
                    <row.icon className="mt-0.5 size-4 shrink-0 text-primary" />
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {row.label}
                      </p>
                      <p className="mt-1 text-sm leading-6">{row.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Disclaimer ──────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-4xl px-6 pb-24">
        <div className="flex items-start gap-4 rounded-2xl border border-amber-500/25 bg-amber-500/5 p-6">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-semibold">Not medical advice</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              StrainWise is an information and comparison tool. Nothing here is
              a diagnosis, prescription, or treatment recommendation. Always
              consult a qualified healthcare provider before using cannabis for
              medical purposes — especially if you take other medication.
            </p>
          </div>
        </div>
      </section>

      {/* ── CTA band ────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-6xl px-6 pb-24">
        <div className="relative overflow-hidden rounded-3xl bg-primary px-8 py-16 text-center text-primary-foreground sm:px-16">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_80%_at_50%_0%,oklch(1_0_0/0.14),transparent_65%)]"
          />
          <h2 className="relative text-2xl font-semibold tracking-tight text-balance sm:text-4xl">
            Find the strain that fits your symptoms
          </h2>
          <p className="relative mx-auto mt-4 max-w-xl text-sm leading-6 text-primary-foreground/80 sm:text-base">
            Tell us what you&apos;re treating — get the strains patients report
            work best, then compare your top picks in seconds.
          </p>
          <div className="relative mt-8 flex justify-center">
            <Button
              asChild
              size="lg"
              variant="secondary"
              className="cursor-pointer rounded-full px-8"
            >
              <Link to="/auth">
                Find my strains — it&apos;s free
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="border-t border-border/60">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-6 px-6 py-10 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <img
              src={logo}
              alt="StrainWise logo"
              width={28}
              height={28}
              className="rounded-lg"
            />
            <span className="text-sm font-semibold tracking-tight">StrainWise</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Find and compare cannabis strains for medical relief. 21+ only · Know your local laws.
          </p>
          <div className="flex items-center gap-5 text-xs text-muted-foreground">
            <a href="#how-it-works" className="transition-colors hover:text-foreground">
              How it works
            </a>
            <Link to="/auth" className="transition-colors hover:text-foreground">
              Sign in
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
