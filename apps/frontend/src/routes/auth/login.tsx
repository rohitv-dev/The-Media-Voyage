import { authClient } from "#/auth/authClient";
import { showErrorNotification } from "#/utils/notifications";
import {
  Text,
  Anchor,
  Button,
  Center,
  Paper,
  PasswordInput,
  Stack,
  TextInput,
  Title,
} from "@mantine/core";
import { schemaResolver, useForm } from "@mantine/form";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

export const Route = createFileRoute("/auth/login")({
  component: RouteComponent,
});

const loginSchema = z.object({
  email: z.email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

function RouteComponent() {
  const navigate = Route.useNavigate();
  const form = useForm({
    mode: "controlled",
    initialValues: {
      email: "",
      password: "",
    },
    validate: schemaResolver(loginSchema, { sync: true }),
  });

  const handleSubmit = form.onSubmit(async (values) => {
    try {
      const res = await authClient.signIn.email({
        email: values.email,
        password: values.password,
      });

      if (res.error) {
        throw new Error(res.error.message);
      }
      navigate({ to: "/media" });
    } catch (err) {
      showErrorNotification({
        title: "Authentication Failed",
        message: String(err),
      });
    }
  });

  return (
    <Center w="100%" mih="100vh" p={{ base: "md", sm: "xl" }}>
      <Paper w="100%" maw={400} p={{ base: "lg", sm: "xl" }} withBorder shadow="md">
        <Title order={2} ta="center" mb="xl">
          Login to your account
        </Title>

        <form onSubmit={handleSubmit}>
          <Stack>
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

            <Button type="submit" mt="md">
              Sign in
            </Button>
          </Stack>
        </form>

        {/* <Divider my="xl" label="Or continue with" labelPosition="center" /> */}

        <Text ta="center" mt="md">
          Don't have an account?{" "}
          <Anchor
            href="#"
            onClick={(e) => {
              e.preventDefault();
              navigate({ to: "/auth/register" });
            }}
          >
            Sign up
          </Anchor>
        </Text>
      </Paper>
    </Center>
  );
}
