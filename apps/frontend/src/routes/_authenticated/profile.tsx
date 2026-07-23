import { authClient } from "#/auth/authClient";
import { downloadApiFile } from "#/lib/api";
import {
  showErrorNotification,
  showSuccessNotification,
} from "#/utils/notifications";
import {
  Container,
  Card,
  Stack,
  Avatar,
  Group,
  TextInput,
  ActionIcon,
  Button,
  Text,
} from "@mantine/core";
import { IconCheck, IconDownload, IconEdit, IconX } from "@tabler/icons-react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/profile")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate()
  const { data } = authClient.useSession();

  const [editingName, setEditingName] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [name, setName] = useState(data?.user.name);

  const handleSave = async () => {
    await authClient.updateUser({
      name,
    });
    setEditingName(false);
    showSuccessNotification({ message: "Profile updated successfully!" });
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
