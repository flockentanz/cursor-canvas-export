import { H1, Pill, Row, Stack, Text, useCanvasState } from "cursor/canvas";

export default function TabsCanvas() {
  const [tab, setTab] = useCanvasState("tab", "tasks");
  return (
    <Stack gap={12}>
      <H1>Tabs canvas</H1>
      <Row gap={8}>
        <Pill active={tab === "tasks"} onClick={() => setTab("tasks")}>
          Tasks
        </Pill>
        <Pill active={tab === "coverage"} onClick={() => setTab("coverage")}>
          Coverage
        </Pill>
      </Row>
      <Text>{tab === "tasks" ? "Tasks panel" : "Coverage panel"}</Text>
    </Stack>
  );
}
