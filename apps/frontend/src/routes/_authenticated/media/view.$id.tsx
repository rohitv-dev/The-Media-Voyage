import { authClient } from "#/auth/authClient";
import { SocialPanel } from "#/features/friends/components/SocialPanel";
import {
  friendMediaCommentsOptions,
  friendsQueryOptions,
} from "#/features/friends/queries";
import { MediaView } from "#/features/media/components/MediaView";
import { userMediaDetailedOptions } from "#/features/media/queries";
import { RecommendFriendModal } from "#/features/recommendations/components/RecommendFriendModal";
import { createFriendRecommendation } from "#/features/recommendations/queries";
import { useCopyPublicLink } from "#/features/public/links";
import { getApiErrorMessage } from "#/lib/api";
import {
  showErrorNotification,
  showSuccessNotification,
} from "#/lib/notifications";
import { useDisclosure } from "@mantine/hooks";
import { useMutation, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useAppReducedMotion } from "#/hooks/useAppReducedMotion";
import { fadeUpEntranceProps } from "#/theme/motion";

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
  const publicLink = useCopyPublicLink("media", id);
  const { data: session } = authClient.useSession();
  const reduceMotion = useAppReducedMotion();
  const [recommendOpened, { open: openRecommend, close: closeRecommend }] =
    useDisclosure(false);
  const friendsQuery = useQuery({
    ...friendsQueryOptions,
    enabled: recommendOpened,
  });
  const recommendationMutation = useMutation({
    mutationFn: createFriendRecommendation,
    onSuccess: () => {
      showSuccessNotification({
        title: "Recommendation sent",
        message: data.title + " was sent to your friend.",
      });
      closeRecommend();
    },
    onError: (error) => {
      showErrorNotification({
        title: "Could not send recommendation",
        message: getApiErrorMessage(error),
      });
    },
  });

  const handleCloseRecommend = () => {
    recommendationMutation.reset();
    closeRecommend();
  };

  return (
    <motion.div {...fadeUpEntranceProps(reduceMotion)}>
      <MediaView
        data={data}
        onRecommendToFriend={openRecommend}
        onCopyPublicLink={
          data.visibility === "public" ? publicLink.copy : undefined
        }
        copyingPublicLink={publicLink.copying}
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
      <RecommendFriendModal
        opened={recommendOpened}
        onClose={handleCloseRecommend}
        mediaTitle={data.title}
        friends={friendsQuery.data ?? []}
        friendsLoading={friendsQuery.isLoading}
        friendsError={
          friendsQuery.error
            ? getApiErrorMessage(friendsQuery.error)
            : undefined
        }
        submitError={
          recommendationMutation.error
            ? getApiErrorMessage(recommendationMutation.error)
            : undefined
        }
        onSubmit={(input) =>
          recommendationMutation.mutate({
            ...input,
            sourceUserMediaId: data.id,
          })
        }
        pending={recommendationMutation.isPending}
      />
    </motion.div>
  );
}
