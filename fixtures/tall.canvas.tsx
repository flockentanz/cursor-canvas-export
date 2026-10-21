import { H1, Stack, Text } from "cursor/canvas";

export default function TallCanvas() {
  return (
    <Stack gap={8} style={{ height: 20000 }}>
      <H1>Tall canvas</H1>
      <Text>Synthetic page used to check the PDF size limit.</Text>
    </Stack>
  );
}
