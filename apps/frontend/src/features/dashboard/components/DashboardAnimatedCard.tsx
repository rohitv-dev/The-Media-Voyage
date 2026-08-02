import { motion } from "motion/react";
import type { ReactNode } from "react";
import { useAppReducedMotion } from "#/hooks/useAppReducedMotion";
import { fadeUpVariants } from "#/theme/motion";

export function DashboardAnimatedCard({ children }: { children: ReactNode }) {
  const reduceMotion = useAppReducedMotion();

  return (
    <motion.div
      variants={fadeUpVariants(reduceMotion)}
      layout={!reduceMotion}
      whileHover={
        reduceMotion
          ? undefined
          : {
              y: -4,
              transition: {
                duration: 0.15,
              },
            }
      }
    >
      {children}
    </motion.div>
  );
}
