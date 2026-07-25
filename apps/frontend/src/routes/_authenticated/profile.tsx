import { authClient } from "#/auth/authClient";
import { downloadApiFile } from "#/lib/api";
import {
  showErrorNotification,
  showSuccessNotification,
} from "#/utils/notifications";
import {
  Container,
  Card,
  Divider,
  Stack,
  Avatar,
  Group,
  Switch,
  TextInput,
  ActionIcon,
  Button,
  SegmentedControl,
  Text,
} from "@mantine/core";
import {
  IconCheck,
  IconDownload,
  IconEdit,
  IconUsers,
  IconX,
} from "@tabler/icons-react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { modals } from "@mantine/modals";
import { shareLibrary } from "#/features/friends/queries";
import { ThemeOptionsList } from "#/theme/ThemeSwitcher";
import { useCoverArtPreference } from "#/features/media/hooks/useCoverArtPreference";
import { useCoverArtSizePreference } from "#/features/media/hooks/useCoverArtSizePreference";

export const Route = createFileRoute("/_authenticated/profile")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate()
  const { data } = authClient.useSession();
  const [showCoverArt, setShowCoverArt] = useCoverArtPreference();
  const [coverArtSize, setCoverArtSize] = useCoverArtSizePreference();

  const [editingName, setEditingName] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [name, setName] = useState(data?.user.name);

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
        message:
          error instanceof Error
            ? error.message
            : "Could not update default visibility",
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
            message:
              error instanceof Error
                ? error.message
                : "Could not update your library",
          });
        } finally {
          setSharing(false);
        }
      },
    });
  };

  const handleSave = async () => {
    try {
      await authClient.updateUser({
        name,
      });
      setEditingName(false);
      showSuccessNotification({ message: "Profile updated successfully!" });
    } catch (error) {
      showErrorNotification({
        message:
          error instanceof Error ? error.message : "Could not update profile",
      });
    }
  };

  const handleCancel = () => {
    setName(data?.user.name);
    setEditingName(false);
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
        message:
          error instanceof Error ? error.message : "Could not export library",
      });
    } finally {
      setExporting(false);
    }
  };

  const logout = async () => {
    await authClient.signOut();
    navigate({ to: "/auth/login" });
  };

  return (
    <Container size="sm" py="xl">
      <Stack gap="lg">
        <Card withBorder radius="lg" p="xl">
          <Stack align="center" gap="xl">
            <Avatar
              src={data?.user.image}
              radius={999}
              size={120}
              name={data?.user.name}
            />

            <Stack gap="xs" w="100%">
              {editingName ? (
                <Group align="flex-end">
                  <TextInput
                    flex={1}
                    value={name}
                    onChange={(e) => setName(e.currentTarget.value)}
                    label="Display Name"
                  />

                  <ActionIcon
                    color="green"
                    size="lg"
                    variant="light"
                    onClick={handleSave}
                  >
                    <IconCheck size={18} />
                  </ActionIcon>

                  <ActionIcon
                    color="red"
                    size="lg"
                    variant="light"
                    onClick={handleCancel}
                  >
                    <IconX size={18} />
                  </ActionIcon>
                </Group>
              ) : (
                <Group justify="center">
                  <Text fw={700} size="xl">
                    {data?.user.name}
                  </Text>

                  <ActionIcon
                    variant="subtle"
                    onClick={() => setEditingName(true)}
                  >
                    <IconEdit size={18} />
                  </ActionIcon>
                </Group>
              )}

              <Text ta="center" c="dimmed">
                {data?.user.email}
              </Text>
            </Stack>

            <Button variant="light" disabled={true}>Change Profile Picture</Button>
          </Stack>
        </Card>

        <Card withBorder radius="lg" p="lg">
          <Stack gap="sm">
            <Stack gap={3}>
              <Text fw={700}>Appearance</Text>
              <Text size="sm" c="dimmed">
                Pick a theme. Your choice is saved on this device.
              </Text>
            </Stack>
            <ThemeOptionsList />

            <Divider />

            <Group justify="space-between" align="center" wrap="wrap" gap="md">
              <Stack gap={2} flex={1} miw={200}>
                <Text size="sm" fw={600}>
                  Cover art
                </Text>
                <Text size="xs" c="dimmed">
                  Show poster/cover images on media cards.
                </Text>
              </Stack>
              <Switch
                checked={showCoverArt}
                onChange={(event) =>
                  setShowCoverArt(event.currentTarget.checked)
                }
                aria-label="Show cover art on media cards"
              />
            </Group>

            <Group justify="space-between" align="center" wrap="wrap" gap="md">
              <Stack gap={2} flex={1} miw={200}>
                <Text size="sm" fw={600}>
                  Image size
                </Text>
                <Text size="xs" c="dimmed">
                  Choose how much space poster/cover images use on media cards.
                </Text>
              </Stack>
              <SegmentedControl
                size="xs"
                value={coverArtSize}
                onChange={(value) => setCoverArtSize(value as typeof coverArtSize)}
                aria-label="Choose media card image size"
                data={[
                  { value: "full", label: "Full" },
                  { value: "large", label: "Large" },
                  { value: "medium", label: "Medium" },
                  { value: "small", label: "Small" },
                ]}
              />
            </Group>
          </Stack>
        </Card>

        <Card withBorder radius="lg" p="lg">
          <Stack gap="sm">
            <Stack gap={3}>
              <Text fw={700}>Sharing</Text>
              <Text size="sm" c="dimmed">
                Friends only ever see entries you've shared — never your
                personal notes.
              </Text>
            </Stack>

            <Group justify="space-between" align="center" wrap="wrap" gap="md">
              <Stack gap={2} flex={1} miw={200}>
                <Text size="sm" fw={600}>
                  Default for new entries
                </Text>
                <Text size="xs" c="dimmed">
                  Applied when you add media without picking a visibility.
                </Text>
              </Stack>
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
            </Group>

            <Divider />

            <Group justify="space-between" align="center" wrap="wrap" gap="md">
              <Stack gap={2} flex={1} miw={200}>
                <Text size="sm" fw={600}>
                  Share existing library
                </Text>
                <Text size="xs" c="dimmed">
                  Change every still-private entry to friends-visible in one go.
                </Text>
              </Stack>
              <Button
                variant="light"
                leftSection={<IconUsers size={18} />}
                loading={sharing}
                onClick={() => handleShareLibrary("friends")}
              >
                Share with friends
              </Button>
            </Group>
          </Stack>
        </Card>

        <Card withBorder radius="lg" p="lg">
          <Group justify="space-between" align="center" wrap="wrap" gap="md">
            <Stack gap={3} flex={1} miw={220}>
              <Text fw={700}>Your data</Text>
              <Text size="sm" c="dimmed">
                Download a CSV backup of every item in your library.
              </Text>
            </Stack>

            <Button
              variant="light"
              leftSection={<IconDownload size={18} />}
              loading={exporting}
              onClick={handleExport}
            >
              Export library
            </Button>
          </Group>
        </Card>
        <Button variant="light" color="red" onClick={logout}>Logout</Button>
      </Stack>
    </Container>
  );
}
