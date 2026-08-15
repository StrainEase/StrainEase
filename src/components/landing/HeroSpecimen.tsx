import cannabisLeaf from "@/assets/cannabis-leaf.webp";
import { cn } from "@/lib/utils";
import { motion, useReducedMotion } from "framer-motion";

const EASE: [number, number, number, number] = [0.32, 0.72, 0, 1];

export function HeroSpecimen({ className }: { className?: string }) {
  const reduce = useReducedMotion();

  return (
    <div
      className={cn(
        "relative mx-auto flex aspect-square w-full max-w-[560px] items-center justify-center",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-[10%] rounded-full bg-[radial-gradient(circle,oklch(0.72_0.12_158/0.22),transparent_68%)]"
      />
      <motion.div
        className="relative z-10 w-[88%] max-w-[480px] cursor-pointer"
        whileHover={reduce ? undefined : { y: -10, scale: 1.03 }}
        transition={{ duration: 0.55, ease: EASE }}
      >
        <motion.img
          src={cannabisLeaf}
          alt="Cannabis leaf"
          width={779}
          height={944}
          className="h-auto w-full select-none drop-shadow-[0_24px_40px_oklch(0.4_0.08_158/0.28)]"
          draggable={false}
          animate={reduce ? undefined : { y: [0, -12, 0] }}
          transition={
            reduce
              ? undefined
              : { duration: 5.5, repeat: Infinity, ease: "easeInOut" }
          }
        />
      </motion.div>
    </div>
  );
}
