import { Center, Loader } from "@mantine/core";

export function FullScreenLoader() {
  return (
    <Center h="100vh" w="100%">
      <Loader />
    </Center>
  );
}
