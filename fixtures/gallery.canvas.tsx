import {
  BarChart,
  Callout,
  Card,
  CardBody,
  CardHeader,
  Grid,
  H1,
  H2,
  Stack,
  Stat,
  Table,
  Text,
} from "cursor/canvas";

export default function ExportGallery() {
  return (
    <Stack gap={16}>
      <H1>Export gallery</H1>
      <Text tone="secondary">Synthetic canvas used to check layout, type, and charts.</Text>
      <Grid columns={4} gap={12}>
        <Stat value="120" label="Requests" tone="success" />
        <Stat value="3" label="Regions" />
        <Stat value="18 ms" label="Latency" tone="success" />
        <Stat value="2" label="Open alerts" tone="warning" />
      </Grid>
      <Callout tone="info" title="How to read this">
        These numbers are fixtures. They are not production metrics.
      </Callout>
      <Stack gap={8}>
        <H2>Latency by service</H2>
        <BarChart
          horizontal
          height={180}
          valueSuffix=" ms"
          categories={["alpha", "beta", "gamma"]}
          series={[{ name: "Latency", data: [18, 12, 9], tone: "info" }]}
        />
      </Stack>
      <Table
        striped
        headers={["Service", "Status"]}
        columnAlign={["left", "right"]}
        rowTone={["success", "warning"]}
        rows={[
          ["api", "ok"],
          ["worker", "hot"],
        ]}
      />
      <Card>
        <CardHeader trailing="example">config</CardHeader>
        <CardBody>
          <Text>No production data is included in this canvas.</Text>
        </CardBody>
      </Card>
    </Stack>
  );
}
