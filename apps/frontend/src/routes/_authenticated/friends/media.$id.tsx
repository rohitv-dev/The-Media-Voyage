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

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
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
