import { H1, Stack, Text, useCanvasState } from "cursor/canvas";

export default function StateCanvas() {
  const [label] = useCanvasState("label", "default-label");
  return (
    <Stack gap={8}>
      <H1>State canvas</H1>
      <Text>{label}</Text>
    </Stack>
  );
}
