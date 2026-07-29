import { authClient } from "#/auth/authClient";
import { SettingRow, SettingsSection } from "#/components/SettingsSection";
import { shareLibrary } from "#/features/friends/queries";
import { useCoverArtPreference } from "#/features/media/hooks/useCoverArtPreference";
import { useCoverArtSizePreference } from "#/features/media/hooks/useCoverArtSizePreference";
import { useReducedMotionPreference } from "#/hooks/useReducedMotionPreference";
import { downloadApiFile, getApiErrorMessage } from "#/lib/api";
import { ThemeOptionsList } from "#/theme/ThemeSwitcher";
import {
  showErrorNotification,
  showSuccessNotification,
} from "#/utils/notifications";
import {
  Anchor,
  Button,
  Container,
  SegmentedControl,
  Stack,
  Switch,
  Text,
  Title,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import {
  IconDownload,
  IconExternalLink,
  IconUsers,
} from "@tabler/icons-react";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/settings")({
  component: RouteComponent,
});

function RouteComponent() {
  const { data } = authClient.useSession();
  const [showCoverArt, setShowCoverArt] = useCoverArtPreference();
  const [coverArtSize, setCoverArtSize] = useCoverArtSizePreference();
  const [reduceMotion, setReduceMotion] = useReducedMotionPreference();

  const [exporting, setExporting] = useState(false);
  const [sharing, setSharing] = useState(false);

  const defaultVisibility = data?.user.defaultVisibility ?? "private";

  const handleDefaultVisibility = async (value: string) => {
    // The control's value comes from the async session, so a remount can fire
    // onChange with a stale value. Never write unless it actually changed.
    if (value === defaultVisibility) return;

    try {
      await authClient.updateUser({ defaultVisibility: value });
      showSuccessNotification({
        message: "New entries will use this visibility.",
      });
    } catch (error) {
      showErrorNotification({
        message: getApiErrorMessage(error, "Could not update default visibility"),
      });
    }
  };

  // Bulk-applies a visibility to entries that are still private. Confirmed
  // first because it exposes ratings, reviews and tags to friends at once.
  const handleShareLibrary = (visibility: "friends" | "public") => {
    modals.openConfirmModal({
      title: "Share your existing library",
      children: (
        <Text size="sm">
          Every entry still marked private will become visible to{" "}
          {visibility === "friends" ? "your friends" : "anyone with the link"},
          including its rating, review, tags and progress. Your personal notes
          stay private. You can change any entry back individually afterwards.
        </Text>
      ),
      labels: { confirm: "Share them", cancel: "Cancel" },
      onConfirm: async () => {
        setSharing(true);

        try {
          const { updated } = await shareLibrary({
            visibility,
            onlyPrivate: true,
          });

          showSuccessNotification({
            message: updated
              ? `${updated} ${updated === 1 ? "entry is" : "entries are"} now shared.`
              : "No private entries left to share.",
          });
        } catch (error) {
          showErrorNotification({
            message: getApiErrorMessage(error, "Could not update your library"),
          });
        } finally {
          setSharing(false);
        }
      },
    });
  };

  const handleExport = async () => {
    setExporting(true);

    try {
      const { blob, filename } = await downloadApiFile("/user-media/export");
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = downloadUrl;
      link.download = filename ?? `media-voyage-${Date.now()}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(downloadUrl);

      showSuccessNotification({
        title: "Export ready",
        message: "Your library backup has been downloaded.",
      });
    } catch (error) {
      showErrorNotification({
        title: "Export failed",
        message: getApiErrorMessage(error, "Could not export library"),
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Container size="sm" py="xl">
      <Stack gap="lg">
        <Stack gap={2}>
          <Title order={2}>Settings</Title>
          <Text c="dimmed" size="sm">
            Appearance, sharing, and your data.
          </Text>
        </Stack>

        <SettingsSection
          title="Appearance"
          description="Pick a theme. Your choice is saved on this device."
        >
          <ThemeOptionsList />
        </SettingsSection>

        <SettingsSection
          title="Accessibility"
          description="Saved on this device. Also respects your OS-level reduced motion setting automatically."
        >
          <SettingRow
            title="Reduce motion"
            description="Turns off page transitions and other large-scale animation."
          >
            <Switch
              checked={reduceMotion}
              onChange={(event) =>
                setReduceMotion(event.currentTarget.checked)
              }
              aria-label="Reduce motion"
            />
          </SettingRow>
        </SettingsSection>

        <SettingsSection
          title="Library display"
          description="How entries look in your library grid. Saved on this device."
        >
          <SettingRow
            title="Cover art"
            description="Show poster/cover images on media cards."
          >
            <Switch
              checked={showCoverArt}
              onChange={(event) => setShowCoverArt(event.currentTarget.checked)}
              aria-label="Show cover art on media cards"
            />
          </SettingRow>

          <SettingRow
            title="Image size"
            description="Choose how much space poster/cover images use on media cards."
          >
            <SegmentedControl
              size="xs"
              value={coverArtSize}
              onChange={setCoverArtSize}
              aria-label="Choose media card image size"
              data={[
                { value: "full", label: "Full" },
                { value: "large", label: "Large" },
                { value: "medium", label: "Medium" },
                { value: "small", label: "Small" },
              ]}
            />
          </SettingRow>
        </SettingsSection>

        <SettingsSection
          title="Sharing"
          description="Friends only ever see entries you've shared — never your personal notes."
        >
          <SettingRow
            title="Default for new entries"
            description="Preselects the visibility field when you add media."
          >
            <SegmentedControl
              size="xs"
              value={defaultVisibility}
              onChange={handleDefaultVisibility}
              aria-label="Default visibility for new entries"
              data={[
                { value: "private", label: "Private" },
                { value: "friends", label: "Friends" },
                { value: "public", label: "Public" },
              ]}
            />
          </SettingRow>

          <SettingRow
            title="Share existing library"
            description="Change every still-private entry to friends-visible in one go."
          >
            <Button
              variant="light"
              leftSection={<IconUsers size={18} />}
              loading={sharing}
              onClick={() => handleShareLibrary("friends")}
            >
              Share with friends
            </Button>
          </SettingRow>
        </SettingsSection>

        <SettingsSection
          title="Your data"
          description="Download a CSV backup of every item in your library."
        >
          <SettingRow
            title="Export library"
            description="Includes ratings, reviews, notes, tags and progress."
          >
            <Button
              variant="light"
              leftSection={<IconDownload size={18} />}
              loading={exporting}
              onClick={handleExport}
            >
              Export library
            </Button>
          </SettingRow>
        </SettingsSection>

        <SettingsSection
          title="Data providers"
          description="Media data is provided by these services."
        >
          <SettingRow title="Games" description="IGDB">
            <Anchor
              href="https://www.igdb.com/"
              target="_blank"
              rel="noreferrer"
              aria-label="Open IGDB"
            >
              <IconExternalLink size={18} />
            </Anchor>
          </SettingRow>

          <SettingRow title="Movies" description="OMDb">
            <Anchor
              href="https://omdbapi.com/"
              target="_blank"
              rel="noreferrer"
              aria-label="Open OMDb"
            >
              <IconExternalLink size={18} />
            </Anchor>
          </SettingRow>

          <SettingRow title="Shows" description="TVMaze">
            <Anchor
              href="https://www.tvmaze.com/"
              target="_blank"
              rel="noreferrer"
              aria-label="Open TVMaze"
            >
              <IconExternalLink size={18} />
            </Anchor>
          </SettingRow>

          <SettingRow title="Books" description="Open Library">
            <Anchor
              href="https://openlibrary.org/"
              target="_blank"
              rel="noreferrer"
              aria-label="Open Open Library"
            >
              <IconExternalLink size={18} />
            </Anchor>
          </SettingRow>
        </SettingsSection>
      </Stack>
    </Container>
  );
}
