import { Button, Group, Text, Title } from "@mantine/core";
import { motion } from "motion/react";
import { fadeUpVariants } from "#/theme/motion";
import { useAppReducedMotion } from "#/hooks/useAppReducedMotion";
import { TutorialTrigger } from "#/features/tutorials/components/TutorialTrigger";

export function DashboardHeader({
  onStartTutorial,
}: {
  onStartTutorial?: () => void;
}) {
  const reduceMotion = useAppReducedMotion();

  return (
    <>
      <motion.div variants={fadeUpVariants(reduceMotion)}>
        <Group gap="xs" align="center">
          <Title
            order={2}
            fz={{ base: "h3", sm: "h1" }}
            data-tutorial="dashboard-overview"
          >
            Dashboard
          </Title>
          {onStartTutorial && (
            <TutorialTrigger
              label="Start Dashboard tutorial"
              onClick={onStartTutorial}
            />
          )}
        </Group>
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
            href="#trending"
            variant="subtle"
            size="compact-sm"
          >
            Trending
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
