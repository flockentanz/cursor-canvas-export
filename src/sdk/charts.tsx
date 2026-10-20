import type { CSSProperties, ReactNode } from "react";
import { useHostTheme } from "./hooks";
import { chartColorSequence, fontStack, toneColor, type ChartTone } from "./tokens";

type Series = { name: string; data: number[]; tone?: ChartTone };
type ReferenceLine = { value: number; label?: string; tone?: ChartTone };

function formatValue(value: number, prefix = "", suffix = ""): string {
  const rounded = Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);
  return `${prefix}${rounded}${suffix}`;
}

function seriesColor(series: Series[], seriesIndex: number, categoryIndex: number): string {
  const entry = series[seriesIndex];
  if (entry?.tone) return toneColor[entry.tone];
  if (series.length === 1) return chartColorSequence[categoryIndex % chartColorSequence.length];
  return chartColorSequence[seriesIndex % chartColorSequence.length];
}

function domain(values: number[], beginAtZero: boolean, yMin?: number, yMax?: number): [number, number] {
  const dataMin = Math.min(...values, 0);
  const dataMax = Math.max(...values, 0);
  const min = yMin ?? (beginAtZero ? Math.min(0, dataMin) : dataMin);
  const max = yMax ?? dataMax;
  if (min === max) return [min, min + 1];
  return [min, max];
}

export function BarChart({
  categories,
  series,
  height = 240,
  stacked = false,
  horizontal = false,
  normalized = false,
  valueSuffix = "",
  valuePrefix = "",
  showValues,
  beginAtZero = true,
  yMin,
  yMax,
  referenceLines,
  style,
}: {
  categories: string[];
  series: Series[];
  height?: number;
  stacked?: boolean;
  horizontal?: boolean;
  normalized?: boolean;
  valueSuffix?: string;
  valuePrefix?: string;
  showValues?: boolean;
  beginAtZero?: boolean;
  yMin?: number;
  yMax?: number;
  referenceLines?: ReferenceLine[];
  style?: CSSProperties;
}) {
  const theme = useHostTheme();
  const isStacked = stacked || normalized;
  const labelsOn =
    showValues ??
    (!isStacked && series.length === 1 && categories.length <= 8);
  const flat = categories.flatMap((_, index) => series.map((item) => item.data[index] ?? 0));
  const [min, max] = domain(
    [...flat, ...(referenceLines?.map((line) => line.value) ?? [])],
    beginAtZero || isStacked,
    isStacked ? 0 : yMin,
    yMax,
  );
  const span = max - min;

  const percent = (value: number) => `${Math.max(0, Math.min(100, ((value - min) / span) * 100))}%`;

  return (
    <div data-chart="bar" style={{ display: "flex", flexDirection: "column", gap: 8, ...style }}>
      <div
        style={{
          minHeight: height,
          display: "flex",
          flexDirection: horizontal ? "column" : "row",
          alignItems: horizontal ? "stretch" : "flex-end",
          gap: horizontal ? 10 : 8,
          justifyContent: horizontal ? "space-evenly" : "flex-start",
        }}
      >
        {categories.map((category, categoryIndex) => {
          const values = series.map((item) => item.data[categoryIndex] ?? 0);
          const total = values.reduce((sum, value) => sum + value, 0) || 1;
          return (
            <div
              key={category}
              style={
                horizontal
                  ? {
                      display: "grid",
                      gridTemplateColumns: "minmax(160px, 1.15fr) minmax(0, 1.7fr) auto",
                      columnGap: 10,
                      alignItems: "center",
                    }
                  : { flex: "1 1 0", minWidth: 0, display: "flex", flexDirection: "column", gap: 6, height: "100%" }
              }
            >
              {horizontal ? (
                <div
                  style={{
                    fontFamily: fontStack,
                    fontSize: 12,
                    lineHeight: "16px",
                    color: theme.text.secondary,
                    textAlign: "right",
                  }}
                >
                  {category}
                </div>
              ) : null}
              <div
                style={
                  horizontal
                    ? {
                        height: 16,
                        borderRadius: 3,
                        background: theme.fill.tertiary,
                        display: "flex",
                        overflow: "hidden",
                      }
                    : {
                        flex: 1,
                        display: "flex",
                        alignItems: "flex-end",
                        gap: isStacked ? 0 : 3,
                        height: height - 28,
                      }
                }
              >
                {series.map((item, seriesIndex) => {
                  const value = values[seriesIndex] ?? 0;
                  const portion = normalized ? (value / total) * 100 : undefined;
                  const color = seriesColor(series, seriesIndex, categoryIndex);
                  return (
                    <div
                      key={item.name}
                      data-bar=""
                      title={`${item.name}: ${formatValue(value, valuePrefix, valueSuffix)}`}
                      style={{
                        background: color,
                        height: horizontal ? "100%" : percent(value),
                        width: horizontal
                          ? normalized
                            ? `${portion}%`
                            : isStacked
                              ? percent(value)
                              : series.length === 1
                                ? percent(value)
                                : percent(value)
                          : isStacked
                            ? "100%"
                            : `${100 / series.length}%`,
                        minWidth: horizontal && value > 0 ? 2 : 0,
                        borderRadius: horizontal && !isStacked ? 3 : 3,
                      }}
                    />
                  );
                })}
              </div>
              {horizontal && labelsOn ? (
                <div
                  data-bar-value=""
                  style={{
                    fontFamily: fontStack,
                    fontSize: 12,
                    lineHeight: "16px",
                    color: theme.text.primary,
                    fontVariantNumeric: "tabular-nums",
                    whiteSpace: "nowrap",
                  }}
                >
                  {formatValue(values[0] ?? 0, valuePrefix, valueSuffix)}
                </div>
              ) : null}
              {horizontal ? null : (
                <div
                  style={{
                    fontFamily: fontStack,
                    fontSize: 12,
                    lineHeight: "16px",
                    color: theme.text.secondary,
                    textAlign: "center",
                    overflowWrap: "anywhere",
                  }}
                >
                  {category}
                  {labelsOn ? (
                    <div data-bar-value="" style={{ color: theme.text.primary }}>
                      {formatValue(values[0] ?? 0, valuePrefix, valueSuffix)}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {series.length > 1 ? <Legend series={series} /> : null}
    </div>
  );
}

function Legend({ series }: { series: Series[] }) {
  const theme = useHostTheme();
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
      {series.map((item, index) => (
        <span
          key={item.name}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontFamily: fontStack,
            fontSize: 12,
            color: theme.text.secondary,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 2,
              background: seriesColor(series, index, 0),
            }}
          />
          {item.name}
        </span>
      ))}
    </div>
  );
}

export function LineChart({
  categories,
  series,
  height = 240,
  fill = false,
  valueSuffix = "",
  valuePrefix = "",
  showValues = false,
  beginAtZero = true,
  yMin,
  yMax,
  referenceLines,
  style,
}: {
  categories: string[];
  series: Series[];
  height?: number;
  fill?: boolean;
  valueSuffix?: string;
  valuePrefix?: string;
  showValues?: boolean;
  showHoverGuide?: boolean;
  beginAtZero?: boolean;
  yMin?: number;
  yMax?: number;
  referenceLines?: ReferenceLine[];
  style?: CSSProperties;
}) {
  const theme = useHostTheme();
  const width = 640;
  const pad = { top: 16, right: 16, bottom: 28, left: 36 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const values = series.flatMap((item) => item.data);
  const [min, max] = domain(
    [...values, ...(referenceLines?.map((line) => line.value) ?? [])],
    beginAtZero,
    yMin,
    yMax,
  );
  const xAt = (index: number) =>
    pad.left + (categories.length <= 1 ? innerW / 2 : (index / (categories.length - 1)) * innerW);
  const yAt = (value: number) => pad.top + ((max - value) / (max - min)) * innerH;

  return (
    <div data-chart="line" style={style}>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img">
        {series.map((item, seriesIndex) => {
          const color = seriesColor(series, seriesIndex, 0);
          const points = item.data.map((value, index) => `${xAt(index)},${yAt(value)}`).join(" ");
          const area = `${pad.left},${pad.top + innerH} ${points} ${xAt(item.data.length - 1)},${pad.top + innerH}`;
          return (
            <g key={item.name}>
              {fill ? <polygon points={area} fill={color} opacity={0.18} /> : null}
              <polyline points={points} fill="none" stroke={color} strokeWidth="2" />
              {item.data.map((value, index) => (
                <g key={index}>
                  <circle cx={xAt(index)} cy={yAt(value)} r="3" fill={color} />
                  {showValues ? (
                    <text
                      x={xAt(index)}
                      y={yAt(value) - 8}
                      textAnchor="middle"
                      fill={theme.text.secondary}
                      fontSize="11"
                      fontFamily={fontStack}
                    >
                      {formatValue(value, valuePrefix, valueSuffix)}
                    </text>
                  ) : null}
                </g>
              ))}
            </g>
          );
        })}
        {categories.map((category, index) => (
          <text
            key={category}
            x={xAt(index)}
            y={height - 8}
            textAnchor="middle"
            fill={theme.text.tertiary}
            fontSize="11"
            fontFamily={fontStack}
          >
            {category}
          </text>
        ))}
      </svg>
      {series.length > 1 ? <Legend series={series} /> : null}
    </div>
  );
}

export function PieChart({
  data,
  size = 200,
  donut = false,
  style,
}: {
  data: Array<{ label: string; value: number; tone?: ChartTone }>;
  size?: number;
  donut?: boolean;
  style?: CSSProperties;
}) {
  const theme = useHostTheme();
  const total = data.reduce((sum, item) => sum + Math.max(0, item.value), 0) || 1;
  const radius = size / 2 - 4;
  const center = size / 2;
  let cursor = -Math.PI / 2;
  const slices = data.map((item, index) => {
    const angle = (Math.max(0, item.value) / total) * Math.PI * 2;
    const start = cursor;
    cursor += angle;
    const large = angle > Math.PI ? 1 : 0;
    const x1 = center + radius * Math.cos(start);
    const y1 = center + radius * Math.sin(start);
    const x2 = center + radius * Math.cos(start + angle);
    const y2 = center + radius * Math.sin(start + angle);
    const path = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2} Z`;
    const color = item.tone ? toneColor[item.tone] : chartColorSequence[index % chartColorSequence.length];
    return { ...item, path, color };
  });

  return (
    <div data-chart="pie" style={{ display: "flex", gap: 16, alignItems: "center", ...style }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img">
        {slices.map((slice) => (
          <path key={slice.label} d={slice.path} fill={slice.color} />
        ))}
        {donut ? (
          <>
            <circle cx={center} cy={center} r={radius * 0.58} fill={theme.bg.editor} />
            <text
              x={center}
              y={center}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={theme.text.primary}
              fontSize="16"
              fontFamily={fontStack}
              fontWeight={590}
            >
              {total}
            </text>
          </>
        ) : null}
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {slices.map((slice) => (
          <span
            key={slice.label}
            style={{
              display: "inline-flex",
              gap: 6,
              alignItems: "center",
              fontFamily: fontStack,
              fontSize: 12,
              color: theme.text.secondary,
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: 2, background: slice.color }} />
            {slice.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export type ChartLabel = ReactNode;
