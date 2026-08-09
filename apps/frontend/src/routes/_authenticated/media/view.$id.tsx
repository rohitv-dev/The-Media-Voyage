import { authClient } from "#/auth/authClient";
import { SocialPanel } from "#/features/friends/components/SocialPanel";
import {
  friendMediaCommentsOptions,
  friendsQueryOptions,
} from "#/features/friends/queries";
import { MediaView } from "#/features/media/components/MediaView";
import { useMediaCardActions } from "#/features/media/hooks/useMediaCardActions";
import { getLibraryReturnDepth } from "#/features/media/libraryNavigation";
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
import {
  createFileRoute,
  useLocation,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
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
  const navigate = useNavigate();
  const router = useRouter();
  const libraryReturnDepth = useLocation({
    select: (location) => getLibraryReturnDepth(location.state),
  });
  const { data } = useSuspenseQuery(userMediaDetailedOptions(id));
  const publicLink = useCopyPublicLink("media", id);
  const { isActionPending, runQuickAction } = useMediaCardActions(data);
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

  const returnToLibrary = () => {
    if (libraryReturnDepth) {
      router.history.go(-libraryReturnDepth);
      return;
    }

    navigate({ to: "/media" });
  };

  const editMedia = () => {
    navigate({
      to: "/media/update/$id",
      params: { id },
      state: (previous) => ({
        ...previous,
        libraryReturnDepth: libraryReturnDepth
          ? libraryReturnDepth + 1
          : undefined,
      }),
    });
  };

  return (
    <motion.div {...fadeUpEntranceProps(reduceMotion)}>
      <MediaView
        data={data}
        onBack={returnToLibrary}
        onEdit={editMedia}
        onRecommendToFriend={openRecommend}
        onCopyPublicLink={
          data.visibility === "public" ? publicLink.copy : undefined
        }
        copyingPublicLink={publicLink.copying}
        onQuickAction={runQuickAction}
        quickActionPending={isActionPending}
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
