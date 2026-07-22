import { authClient } from "#/auth/authClient";
import { showErrorNotification } from "#/utils/notifications";
import {
  Center,
  Paper,
  Title,
  Stack,
  TextInput,
  PasswordInput,
  Button,
  Divider,
  Anchor,
  Text,
} from "@mantine/core";
import { schemaResolver, useForm } from "@mantine/form";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

export const Route = createFileRoute("/auth/register")({
  component: RouteComponent,
});

const registerSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    email: z.email("Please enter a valid email"),
    password: z.string().min(1, "Password is required"),
    confirmPassword: z.string().min(1, "Confirm password is required"),
    inviteCode: z.string().min(1, "Invite code is required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords must match",
  });

function RouteComponent() {
  const navigate = Route.useNavigate();
  const form = useForm({
    mode: "controlled",
    initialValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      inviteCode: "",
    },
    validate: schemaResolver(registerSchema, { sync: true }),
  });

  const handleSubmit = form.onSubmit(async (values) => {
    try {
      const res = await authClient.signUp.email({
        email: values.email,
        password: values.password,
        name: values.name,
        fetchOptions: {
          headers: { "x-invite-code": values.inviteCode },
        },
      });

      if ((res as any).error) {
        throw new Error((res as any).error.message);
      }

      navigate({ to: "/media" });
    } catch (err) {
      showErrorNotification({
        title: "Registration Failed",
        message: String(err),
      });
    }
  });

  return (
    <Center w="100%" mih="100vh" p={{ base: "md", sm: "xl" }}>
      <Paper w="100%" maw={400} p={{ base: "lg", sm: "xl" }} withBorder shadow="md">
        <Title order={2} ta="center" mb="xl">
          Create an account
        </Title>

        <form onSubmit={handleSubmit}>
          <Stack>
            <TextInput
              label="Name"
              placeholder="Your name"
              {...form.getInputProps("name")}
            />

            <TextInput
              label="Email"
              placeholder="you@example.com"
              {...form.getInputProps("email")}
            />

            <PasswordInput
              label="Password"
              placeholder="Your password"
              {...form.getInputProps("password")}
            />

            <PasswordInput
              label="Confirm Password"
              placeholder="Confirm your password"
              {...form.getInputProps("confirmPassword")}
            />

            <TextInput
              label="Invite Code"
              placeholder="Ask whoever runs this instance"
              {...form.getInputProps("inviteCode")}
            />

            <Button type="submit" mt="md">
              Sign up
            </Button>
          </Stack>
        </form>

        <Divider my="xl" label="Or continue with" labelPosition="center" />

        {/* <Group position="center" grow>
          <Button
            leftIcon={<IconBrandGoogle />}
            variant="outline"
            onClick={() => console.log("Google SSO clicked")}
          >
            Google
          </Button>
        </Group> */}

        <Text ta="center" mt="md">
          Already have an account?{" "}
          <Anchor
            href="#"
            onClick={(e) => {
              e.preventDefault();
              navigate({ to: "/auth/login" });
            }}
          >
            Sign in
          </Anchor>
        </Text>
      </Paper>
    </Center>
  );
}
