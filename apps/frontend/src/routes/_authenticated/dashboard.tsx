import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Container, Stack } from "@mantine/core";
import { motion } from "motion/react";
import { useMediaQuery } from "@mantine/hooks";
import { useAppReducedMotion } from "#/hooks/useAppReducedMotion";
import { fadeUpVariants, pageStaggerVariants } from "#/theme/motion";
import {
  continueMediaFilters,
  continueMediaQueryOptions,
} from "#/features/media/queries";
import { dashboardStatOptions } from "#/features/dashboard/queries";
import { useSuspenseQuery } from "@tanstack/react-query";
import { DashboardContinue } from "#/features/dashboard/components/DashboardContinue";
import { DashboardHeader } from "#/features/dashboard/components/DashboardHeader";
import { DashboardInsights } from "#/features/dashboard/components/DashboardInsights";
import { DashboardOverview } from "#/features/dashboard/components/DashboardOverview";
import type { UserMediaQuerySchema } from "@media-voyage/shared/api";
import type { MediaType, Status } from "@media-voyage/shared/userMediaSchema";

function statusFilters(status: Status): UserMediaQuerySchema {
  return { status: [status], sort: "updatedAt", order: "desc" };
}

function typeFilters(type: MediaType): UserMediaQuerySchema {
  return { type: [type], sort: "updatedAt", order: "desc" };
}

function ratingFilters(rating: number): UserMediaQuerySchema {
  return {
    minRating: rating,
    maxRating: rating,
    sort: "updatedAt",
    order: "desc",
  };
}

export const Route = createFileRoute("/_authenticated/dashboard")({
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(dashboardStatOptions);
    queryClient.ensureQueryData(continueMediaQueryOptions);
  },
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const { data } = useSuspenseQuery(dashboardStatOptions);
  const { data: continueData } = useSuspenseQuery(continueMediaQueryOptions);
  const continueItems = continueData.data.slice(0, 6);
  const reduceMotion = useAppReducedMotion();
  const isMobile = useMediaQuery("(max-width: 36em)");
  const barChartHeight = isMobile ? 220 : 320;
  const sectionScrollMargin =
    "calc(var(--app-shell-header-height) + var(--mantine-spacing-md))";

  const goToLibrary = (search?: UserMediaQuerySchema) =>
    navigate({ to: "/media", search });

  const handleStatClick = (key: keyof typeof data.summary) => {
    if (key === "collections") {
      navigate({ to: "/collection" });
      return;
    }

    goToLibrary(key === "total_media" ? undefined : statusFilters(key));
  };

  return (
    <Container
      size="xl"
      py={{ base: "md", sm: "xl" }}
      px={{ base: "xs", sm: "md" }}
    >
      <motion.div
        variants={pageStaggerVariants(reduceMotion)}
        initial="hidden"
        animate="visible"
      >
        <Stack gap="md">
          <DashboardHeader />

          <motion.div
            id="overview"
            variants={fadeUpVariants(reduceMotion)}
            style={{ scrollMarginTop: sectionScrollMargin }}
          >
            <DashboardOverview
              summary={data.summary}
              onStatClick={handleStatClick}
            />
          </motion.div>

          <motion.div
            id="continue"
            variants={fadeUpVariants(reduceMotion)}
            style={{ scrollMarginTop: sectionScrollMargin }}
          >
            <DashboardContinue
              items={continueItems}
              reduceMotion={reduceMotion}
              onViewAll={() =>
                navigate({ to: "/media", search: continueMediaFilters })
              }
              onView={(id) =>
                navigate({
                  to: "/media/view/$id",
                  params: { id },
                  viewTransition: true,
                })
              }
            />
          </motion.div>

          <motion.div
            id="insights"
            variants={fadeUpVariants(reduceMotion)}
            style={{ scrollMarginTop: sectionScrollMargin }}
          >
            <DashboardInsights
              data={data}
              isMobile={isMobile}
              barChartHeight={barChartHeight}
              onStatusClick={(status) => goToLibrary(statusFilters(status))}
              onRatingClick={(rating) => goToLibrary(ratingFilters(rating))}
              onTypeClick={(type) => goToLibrary(typeFilters(type))}
            />
          </motion.div>
        </Stack>
      </motion.div>
    </Container>
  );
}
