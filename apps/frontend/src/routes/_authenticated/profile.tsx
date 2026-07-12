import { authClient } from "#/auth/authClient";
import { showSuccessNotification } from "#/utils/notifications";
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
import { IconCheck, IconX, IconEdit } from "@tabler/icons-react";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/profile")({
  component: RouteComponent,
});

function RouteComponent() {
  const { data } = authClient.useSession();

  const [editingName, setEditingName] = useState(false);
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

  return (
    <Container size="sm" py="xl">
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

          <Button variant="light">Change Profile Picture</Button>
        </Stack>
      </Card>
    </Container>
  );
}
