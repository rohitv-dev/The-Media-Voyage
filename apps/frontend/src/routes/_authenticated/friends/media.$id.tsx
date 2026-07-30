import { SocialPanel } from "#/features/friends/components/SocialPanel";
import {
  friendMediaCommentsOptions,
  friendMediaDetailOptions,
} from "#/features/friends/queries";
import { MediaView } from "#/features/media/components/MediaView";
import { api, getApiErrorMessage } from "#/lib/api";
import { queryKeys } from "#/lib/queryKeys";
import { showErrorNotification } from "#/lib/notifications";
import { capitalizeWords } from "#/utils/strings";
import type { MediaDetailedRecord } from "@media-voyage/shared/api";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import {
  createFileRoute,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import { motion } from "motion/react";
import { useAppReducedMotion } from "#/hooks/useAppReducedMotion";
import { fadeUpEntranceProps } from "#/theme/motion";

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
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data } = useSuspenseQuery(friendMediaDetailOptions(id));
  const reduceMotion = useAppReducedMotion();

  const copyMutation = useMutation({
    mutationFn: () =>
      api<MediaDetailedRecord>("/user-media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaId: data.mediaId,
          title: data.title,
          type: data.type,
          status: "planned",
        }),
      }),
    onSuccess: async (record) => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.userMedia.all,
      });
      navigate({ to: "/media/update/$id", params: { id: record.id } });
    },
    onError: (error: Error) => {
      showErrorNotification({
        title: "Could not copy to your library",
        message: getApiErrorMessage(error),
      });
    },
  });

  return (
    <motion.div {...fadeUpEntranceProps(reduceMotion)}>
      <MediaView
        data={data}
        readOnly
        backLabel="Back"
        onBack={() => router.history.back()}
        eyebrow={`${capitalizeWords(data.type)} / ${data.ownerName}'s entry`}
        onCopyToLibrary={() => copyMutation.mutate()}
        copyingToLibrary={copyMutation.isPending}
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
