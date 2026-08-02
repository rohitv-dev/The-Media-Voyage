import { Button, Group, Text, Title } from "@mantine/core";
import { motion } from "motion/react";
import { fadeUpVariants } from "#/theme/motion";
import { useAppReducedMotion } from "#/hooks/useAppReducedMotion";

export function DashboardHeader() {
  const reduceMotion = useAppReducedMotion();

  return (
    <>
      <motion.div variants={fadeUpVariants(reduceMotion)}>
        <Title order={2} fz={{ base: "h3", sm: "h1" }}>
          Dashboard
        </Title>
      </motion.div>

      <motion.div variants={fadeUpVariants(reduceMotion)}>
        <Group gap="xs" wrap="wrap">
          <Text
            size="xs"
            fw={600}
            c="dimmed"
            tt="uppercase"
            style={{ letterSpacing: "0.08em" }}
          >
            Jump to
          </Text>
          <Text c="dimmed" size="xs">
            /
          </Text>
          <Button
            component="a"
            href="#overview"
            variant="subtle"
            size="compact-sm"
          >
            Overview
          </Button>
          <Text c="dimmed" size="xs">
            /
          </Text>
          <Button
            component="a"
            href="#continue"
            variant="subtle"
            size="compact-sm"
          >
            Continue
          </Button>
          <Text c="dimmed" size="xs">
            /
          </Text>
          <Button
            component="a"
            href="#insights"
            variant="subtle"
            size="compact-sm"
          >
            Insights
          </Button>
        </Group>
      </motion.div>
    </>
  );
}
