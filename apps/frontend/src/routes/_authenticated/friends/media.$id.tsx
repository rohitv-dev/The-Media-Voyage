import { SocialPanel } from "#/features/friends/components/SocialPanel";
import {
  friendMediaCommentsOptions,
  friendMediaDetailOptions,
} from "#/features/friends/queries";
import { MediaView } from "#/features/media/components/MediaView";
import { capitalizeWords } from "#/utils/stringFunctions";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useAppReducedMotion } from "#/hooks/useAppReducedMotion";
import { fadeUpEntranceProps } from "#/utils/motionVariants";

export const Route = createFileRoute("/_authenticated/friends/media/$id")({
  loader: ({ context: { queryClient }, params: { id } }) => {
    queryClient.ensureQueryData(friendMediaDetailOptions(id));
    queryClient.ensureQueryData(friendMediaCommentsOptions(id));
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();
  const router = useRouter();
  const { data } = useSuspenseQuery(friendMediaDetailOptions(id));
  const reduceMotion = useAppReducedMotion();

  return (
    <motion.div {...fadeUpEntranceProps(reduceMotion)}>
      <MediaView
        data={data}
        readOnly
        backLabel="Back"
        onBack={() => router.history.back()}
        eyebrow={`${capitalizeWords(data.type)} / ${data.ownerName}'s entry`}
        footer={
          <SocialPanel
            userMediaId={data.id}
            reactions={data.reactions}
            ownerId={data.ownerId}
          />
        }
      />
    </motion.div>
  );
}
