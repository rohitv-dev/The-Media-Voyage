import { authClient } from "#/auth/authClient";
import {
  Box,
  Button,
  Container,
  Grid,
  Group,
  Image,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import {
  IconArrowUpRight,
  IconBooks,
  IconCalendar,
  IconDeviceGamepad2,
  IconMovie,
  IconSearch,
  IconTags,
} from "@tabler/icons-react";
import { createFileRoute, Link } from "@tanstack/react-router";

const FEATURES = [
  {
    title: "Movies & Shows",
    description:
      "Log what you watch, rate it, and keep track of your progress.",
    icon: IconMovie,
  },
  {
    title: "Games",
    description: "Track your games, completion status, and time spent.",
    icon: IconDeviceGamepad2,
  },
  {
    title: "Collections",
    description: "Create custom lists for any mood, genre, or theme.",
    icon: IconBooks,
  },
  {
    title: "Activity Calendar",
    description: "See your viewing and playing activity over time.",
    icon: IconCalendar,
  },
  {
    title: "Smart Search",
    description: "Find titles quickly with search across multiple sources.",
    icon: IconSearch,
  },
  {
    title: "Tags & Sources",
    description: "Organize with tags and manage your metadata sources.",
    icon: IconTags,
  },
] as const;

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const session = authClient.useSession();
  const appRoute = session.data ? "/media" : "/auth/login";

  return (
    <Box
      component="main"
      style={{
        minHeight: "100vh",
        overflow: "hidden",
        background: "var(--mantine-color-body)",
      }}
    >
      <Container size={1320} px={{ base: "md", sm: "xl" }}>
        <Group
          component="header"
          justify="space-between"
          py={{ base: "sm", sm: "md" }}
        >
          <Link
            to="/"
            aria-label="Media Voyage home"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 16,
              color: "var(--mantine-color-text)",
              textDecoration: "none",
            }}
          >
            <img
              src="/media-voyage-mark.svg"
              alt=""
              aria-hidden="true"
              width="52"
              height="52"
            />
            <Text
              fz={{ base: "lg", sm: 28 }}
              fw={600}
              style={{ letterSpacing: "-0.035em" }}
            >
              Media Voyage
            </Text>
          </Link>

          <Group gap="sm" wrap="nowrap">
            <Button
              component={Link}
              to={appRoute}
              radius="xl"
              rightSection={<IconArrowUpRight size={19} />}
              style={{ minHeight: 48 }}
            >
              Open App
            </Button>
          </Group>
        </Group>

        <Grid
          component="section"
          aria-labelledby="landing-title"
          align="center"
          justify="center"
          py={{ base: 36, md: 56 }}
        >
          <Grid.Col span={{ base: 12, md: 5 }}>
            <Stack gap="lg" maw={560}>
              <Stack gap="md">
                <Title
                  id="landing-title"
                  order={1}
                  style={{
                    fontSize: "clamp(2.8rem, 5vw, 4.6rem)",
                    fontWeight: 650,
                    letterSpacing: "-0.065em",
                    lineHeight: 0.98,
                  }}
                >
                  Your personal
                  <br />
                  media log
                </Title>
                <Text size="md" lh={1.6} c="dimmed" maw={500}>
                  Track the movies, shows, and games you watch or play. Keep
                  your lists organized, your progress saved, and your favorites
                  easy to find.
                </Text>
              </Stack>

              <Button
                component={Link}
                to={appRoute}
                size="md"
                radius="xl"
                px="xl"
                rightSection={<IconArrowUpRight size={21} />}
                style={{
                  alignSelf: "flex-start",
                }}
              >
                Open App
              </Button>
            </Stack>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 5 }}>
            <Box pos="relative" style={{ lineHeight: 0 }}>
              <Image
                src="/media-voyage-space.png"
                alt="An illustrated spacecraft travelling through space"
                fit="contain"
                w="100%"
                maw={{ base: "100%", md: 460 }}
                mx="auto"
              />
            </Box>
          </Grid.Col>
        </Grid>

        <Stack
          id="features"
          component="section"
          aria-labelledby="features-title"
          align="center"
          gap={36}
          py={{ base: 36, md: 64 }}
        >
          <Title
            order={2}
            id="features-title"
            style={{ letterSpacing: "-0.04em" }}
          >
            What you can track
          </Title>

          <SimpleGrid
            cols={{ base: 2, xs: 3, md: 6 }}
            spacing={{ base: "xl", md: "lg" }}
            w="100%"
          >
            {FEATURES.map(({ title, description, icon: Icon }) => (
              <Stack key={title} align="center" gap="sm" ta="center">
                <ThemeIcon size={68} radius="lg" variant="light" color="accent">
                  <Icon size={31} stroke={1.8} />
                </ThemeIcon>
                <Text fw={650} lh={1.3}>
                  {title}
                </Text>
                <Text size="sm" lh={1.7} c="dimmed">
                  {description}
                </Text>
              </Stack>
            ))}
          </SimpleGrid>
        </Stack>

        <Stack
          component="footer"
          align="center"
          gap="md"
          py={{ base: 56, md: 80 }}
        >
          <Text fz={32} c="accent" lh={1} aria-hidden="true">
            ✦
          </Text>

          <Text size="sm" c="dimmed">
            © {new Date().getFullYear()} Media Voyage, Mine
          </Text>
        </Stack>
      </Container>
    </Box>
  );
}
