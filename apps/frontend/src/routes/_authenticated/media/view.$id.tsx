import { authClient } from "#/auth/authClient";
import { SocialPanel } from "#/features/friends/components/SocialPanel";
import { friendMediaCommentsOptions } from "#/features/friends/queries";
import { MediaView } from "#/features/media/components/MediaView";
import { userMediaDetailedOptions } from "#/features/media/queries";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";

export const Route = createFileRoute("/_authenticated/media/view/$id")({
  loader: ({ context: { queryClient }, params: { id } }) => {
    queryClient.ensureQueryData(userMediaDetailedOptions(id));
    queryClient.ensureQueryData(friendMediaCommentsOptions(id));
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(userMediaDetailedOptions(id));
  const { data: session } = authClient.useSession();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <MediaView
        data={data}
        footer={
          session?.user.id ? (
            <SocialPanel
              userMediaId={data.id}
              reactions={data.reactions}
              ownerId={session.user.id}
            />
          ) : undefined
        }
      />
    </motion.div>
  );
}
