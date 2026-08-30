import { authClient } from "#/auth/authClient";
import { getApiErrorMessage } from "#/lib/api";
import { CopyPublicLinkButton } from "#/features/public/components/CopyPublicLinkButton";
import { clearPushNotificationToken } from "#/features/notifications/hooks/usePushNotifications";
import {
  showErrorNotification,
  showSuccessNotification,
} from "#/lib/notifications";
import {
  ActionIcon,
  Avatar,
  Button,
  Card,
  Container,
  Group,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { IconCheck, IconEdit, IconSettings, IconX } from "@tabler/icons-react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { sessionQueryKey } from "#/auth/session";

export const Route = createFileRoute("/_authenticated/profile")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data } = authClient.useSession();

  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(data?.user.name);

  const handleSave = async () => {
    try {
      await authClient.updateUser({
        name,
      });
      setEditingName(false);
      showSuccessNotification({ message: "Profile updated successfully!" });
    } catch (error) {
      showErrorNotification({
        message: getApiErrorMessage(error, "Could not update profile"),
      });
    }
  };

  const handleCancel = () => {
    setName(data?.user.name);
    setEditingName(false);
  };

  const logout = async () => {
    await clearPushNotificationToken();
    await authClient.signOut();
    await queryClient.invalidateQueries({ queryKey: sessionQueryKey });
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

            <Button variant="light" disabled={true}>
              Change Profile Picture
            </Button>

            <CopyPublicLinkButton resource="library" />
          </Stack>
        </Card>

        <Card withBorder radius="lg" p="lg">
          <Group justify="space-between" align="center" wrap="wrap" gap="md">
            <Stack gap={3} flex={1} miw={220}>
              <Text fw={700}>Settings</Text>
              <Text size="sm" c="dimmed">
                Appearance, sharing, and your data.
              </Text>
            </Stack>

            <Button
              variant="light"
              leftSection={<IconSettings size={18} />}
              onClick={() => navigate({ to: "/settings" })}
            >
              Open settings
            </Button>
          </Group>
        </Card>

        <Button variant="light" color="red" onClick={logout}>
          Logout
        </Button>
      </Stack>
    </Container>
  );
}
