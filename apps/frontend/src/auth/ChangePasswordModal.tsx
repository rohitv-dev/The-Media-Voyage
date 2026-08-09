import { authClient } from "#/auth/authClient";
import { getApiErrorMessage } from "#/lib/api";
import {
  showErrorNotification,
  showSuccessNotification,
} from "#/lib/notifications";
import {
  Button,
  Group,
  Modal,
  PasswordInput,
  Stack,
  Text,
} from "@mantine/core";
import { schemaResolver, useForm } from "@mantine/form";
import { useState } from "react";
import { z } from "zod";

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password must be 128 characters or fewer"),
    confirmNewPassword: z.string().min(1, "Please confirm your new password"),
  })
  .superRefine((values, ctx) => {
    if (values.newPassword === values.currentPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["newPassword"],
        message: "New password must be different from your current password",
      });
    }

    if (values.newPassword !== values.confirmNewPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["confirmNewPassword"],
        message: "Passwords must match",
      });
    }
  });

type ChangePasswordModalProps = {
  opened: boolean;
  onClose: () => void;
  email?: string;
  onSuccess?: () => void;
};

export function ChangePasswordModal({
  opened,
  onClose,
  email,
  onSuccess,
}: ChangePasswordModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const form = useForm({
    mode: "controlled",
    initialValues: {
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    },
    validate: schemaResolver(changePasswordSchema, { sync: true }),
  });

  const handleClose = () => {
    if (submitting) return;

    form.reset();
    onClose();
  };

  const handleSubmit = form.onSubmit(async (values) => {
    let temporarySessionCreated = false;

    setSubmitting(true);

    try {
      if (email) {
        const signInResult = await authClient.signIn.email({
          email,
          password: values.currentPassword,
        });

        if (signInResult.error) {
          throw new Error(signInResult.error.message ?? "Could not sign in");
        }

        temporarySessionCreated = true;
      }

      const changePasswordResult = await authClient.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
        revokeOtherSessions: true,
      });

      if (changePasswordResult.error) {
        throw new Error(
          changePasswordResult.error.message ?? "Could not change password",
        );
      }

      form.reset();
      onClose();
      showSuccessNotification({ message: "Your password has been changed." });
      onSuccess?.();
    } catch (error) {
      if (temporarySessionCreated) {
        try {
          await authClient.signOut();
        } catch {
          // The password change failed, so avoid leaving a newly-created
          // session behind when possible. The original error is more useful.
        }
      }

      showErrorNotification({
        message: getApiErrorMessage(error, "Could not change your password"),
      });
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      centered
      title="Change password"
      closeOnClickOutside={!submitting}
      closeOnEscape={!submitting}
      withCloseButton={!submitting}
    >
      <form onSubmit={handleSubmit}>
        <Stack>
          <Text size="sm" c="dimmed">
            Changing your password signs you out on other devices.
          </Text>

          <PasswordInput
            label="Current password"
            placeholder="Enter your current password"
            {...form.getInputProps("currentPassword")}
          />

          <PasswordInput
            label="New password"
            description="Use 8 to 128 characters."
            placeholder="Enter a new password"
            {...form.getInputProps("newPassword")}
          />

          <PasswordInput
            label="Confirm new password"
            placeholder="Re-enter your new password"
            {...form.getInputProps("confirmNewPassword")}
          />

          <Group justify="flex-end" mt="sm">
            <Button
              variant="default"
              onClick={handleClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Change password
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
