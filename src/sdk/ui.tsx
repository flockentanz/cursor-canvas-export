import {
  createContext,
  useContext,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useHostTheme } from "./hooks";
import { fontStack, monoStack, toneColor, type ChartTone } from "./tokens";

export function mergeStyle(base: CSSProperties, override?: CSSProperties): CSSProperties {
  return override ? { ...base, ...override } : base;
}

const alignItems = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  stretch: "stretch",
} as const;

const justifyContent = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  "space-between": "space-between",
} as const;

export function Stack({
  children,
  gap = 0,
  style,
}: {
  children?: ReactNode;
  gap?: number;
  style?: CSSProperties;
}) {
  return (
    <div style={mergeStyle({ display: "flex", flexDirection: "column", gap }, style)}>
      {children}
    </div>
  );
}

export function Row({
  children,
  gap = 0,
  align = "stretch",
  justify = "start",
  wrap = false,
  style,
}: {
  children?: ReactNode;
  gap?: number;
  align?: keyof typeof alignItems;
  justify?: keyof typeof justifyContent;
  wrap?: boolean;
  style?: CSSProperties;
}) {
  return (
    <div
      style={mergeStyle(
        {
          display: "flex",
          flexDirection: "row",
          gap,
          alignItems: alignItems[align],
          justifyContent: justifyContent[justify],
          flexWrap: wrap ? "wrap" : "nowrap",
        },
        style,
      )}
    >
      {children}
    </div>
  );
}

export function Grid({
  children,
  columns,
  gap = 0,
  align = "stretch",
  style,
}: {
  children?: ReactNode;
  columns: number | string;
  gap?: number;
  align?: keyof typeof alignItems;
  style?: CSSProperties;
}) {
  const template =
    typeof columns === "number" ? `repeat(${columns}, minmax(0, 1fr))` : columns;
  return (
    <div
      style={mergeStyle(
        {
          display: "grid",
          gridTemplateColumns: template,
          gap,
          alignItems: alignItems[align],
        },
        style,
      )}
    >
      {children}
    </div>
  );
}

export function Divider({ style }: { style?: CSSProperties }) {
  const theme = useHostTheme();
  return (
    <hr
      style={mergeStyle(
        {
          border: 0,
          width: "100%",
          height: 1,
          margin: 0,
          background: theme.stroke.tertiary,
        },
        style,
      )}
    />
  );
}

export function Spacer() {
  return <div style={{ flex: "1 1 auto" }} />;
}

function Heading({
  tag,
  fontSize,
  lineHeight,
  children,
  style,
}: {
  tag: "h1" | "h2" | "h3";
  fontSize: number;
  lineHeight: string;
  children?: ReactNode;
  style?: CSSProperties;
}) {
  const theme = useHostTheme();
  const Tag = tag;
  return (
    <Tag
      style={mergeStyle(
        {
          margin: 0,
          fontFamily: fontStack,
          fontSize,
          lineHeight,
          fontWeight: 590,
          color: theme.text.primary,
        },
        style,
      )}
    >
      {children}
    </Tag>
  );
}

export function H1({ children, style }: { children?: ReactNode; style?: CSSProperties }) {
  return (
    <Heading tag="h1" fontSize={24} lineHeight="30px" style={style}>
      {children}
    </Heading>
  );
}

export function H2({ children, style }: { children?: ReactNode; style?: CSSProperties }) {
  return (
    <Heading tag="h2" fontSize={18} lineHeight="24px" style={style}>
      {children}
    </Heading>
  );
}

export function H3({ children, style }: { children?: ReactNode; style?: CSSProperties }) {
  return (
    <Heading tag="h3" fontSize={16} lineHeight="22px" style={style}>
      {children}
    </Heading>
  );
}

const textNest = createContext(0);

const textWeight = { normal: 400, medium: 500, semibold: 590, bold: 700 } as const;

export function Text({
  children,
  tone = "primary",
  size = "body",
  as,
  weight = "normal",
  italic = false,
  truncate,
  style,
}: {
  children?: ReactNode;
  tone?: "primary" | "secondary" | "tertiary" | "quaternary";
  size?: "body" | "small";
  as?: "p" | "span";
  weight?: keyof typeof textWeight;
  italic?: boolean;
  truncate?: boolean | "start" | "end";
  style?: CSSProperties;
}) {
  const theme = useHostTheme();
  const depth = useContext(textNest);
  const tag = as ?? (depth > 0 ? "span" : "p");
  const metrics =
    size === "small"
      ? { fontSize: 12, lineHeight: "16px" }
      : { fontSize: 14, lineHeight: "20px" };
  const truncation: CSSProperties =
    truncate === true || truncate === "end"
      ? { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }
      : truncate === "start"
        ? {
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            direction: "rtl",
            textAlign: "left",
          }
        : {};
  const Tag = tag;
  return (
    <textNest.Provider value={depth + 1}>
      <Tag
        style={mergeStyle(
          {
            margin: 0,
            fontFamily: fontStack,
            color: theme.text[tone],
            fontWeight: textWeight[weight],
            fontStyle: italic ? "italic" : "normal",
            ...metrics,
            ...truncation,
          },
          style,
        )}
      >
        {typeof children === "string" ? parseInline(children) : children}
      </Tag>
    </textNest.Provider>
  );
}

function parseInline(text: string): ReactNode {
  const pattern = /`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\)/g;
  const nodes: ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  let index = 0;
  while ((match = pattern.exec(text))) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    if (match[1] != null) nodes.push(<Code key={index}>{match[1]}</Code>);
    else nodes.push(
      <Link key={index} href={match[3]}>
        {match[2]}
      </Link>,
    );
    last = match.index + match[0].length;
    index += 1;
  }
  if (nodes.length === 0) return text;
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function Code({ children, style }: { children?: ReactNode; style?: CSSProperties }) {
  const theme = useHostTheme();
  return (
    <code
      style={mergeStyle(
        {
          fontFamily: monoStack,
          fontSize: "0.92em",
          padding: "1px 4px",
          borderRadius: 4,
          background: theme.fill.tertiary,
          color: theme.text.primary,
        },
        style,
      )}
    >
      {children}
    </code>
  );
}

export function Link({
  children,
  href,
  style,
}: {
  children?: ReactNode;
  href: string;
  style?: CSSProperties;
}) {
  const theme = useHostTheme();
  return (
    <a
      href={href}
      style={mergeStyle(
        { color: theme.text.link, textDecoration: "underline", textUnderlineOffset: 2 },
        style,
      )}
    >
      {children}
    </a>
  );
}

type CardContextValue = { open: boolean; size: "base" | "lg" };
const cardContext = createContext<CardContextValue>({ open: true, size: "base" });

export function Card({
  children,
  variant = "default",
  size = "base",
  collapsible = false,
  defaultOpen = true,
  open,
  style,
}: {
  children?: ReactNode;
  variant?: "default" | "borderless";
  size?: "base" | "lg";
  stickyHeader?: boolean;
  collapsible?: boolean;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  style?: CSSProperties;
}) {
  const theme = useHostTheme();
  const isOpen = open ?? (collapsible ? defaultOpen : true);
  const framed = variant !== "borderless";
  return (
    <cardContext.Provider value={{ open: collapsible ? isOpen : true, size }}>
      <section
        data-card=""
        style={mergeStyle(
          {
            border: framed ? `1px solid ${theme.stroke.primary}` : "none",
            borderRadius: framed ? 8 : 0,
            background: theme.bg.elevated,
            overflow: "hidden",
          },
          style,
        )}
      >
        {children}
      </section>
    </cardContext.Provider>
  );
}

export function CardHeader({
  children,
  trailing,
  style,
}: {
  children?: ReactNode;
  trailing?: ReactNode;
  style?: CSSProperties;
}) {
  const theme = useHostTheme();
  const { size } = useContext(cardContext);
  return (
    <div
      data-card-header=""
      style={mergeStyle(
        {
          display: "flex",
          alignItems: "center",
          gap: 12,
          minHeight: size === "lg" ? 32 : 28,
          padding: "4px 12px",
          fontFamily: fontStack,
          fontSize: 12,
          lineHeight: "16px",
          fontWeight: 590,
          color: theme.text.primary,
          borderBottom: `1px solid ${theme.stroke.tertiary}`,
        },
        style,
      )}
    >
      <span style={{ flex: "1 1 auto", minWidth: 0 }}>{children}</span>
      {trailing != null && trailing !== false ? (
        <span style={{ flex: "none", color: theme.text.tertiary, fontWeight: 400 }}>{trailing}</span>
      ) : null}
    </div>
  );
}

export function CardBody({ children, style }: { children?: ReactNode; style?: CSSProperties }) {
  const { open } = useContext(cardContext);
  if (!open) return null;
  return <div style={mergeStyle({ padding: 12 }, style)}>{children}</div>;
}

export function CanvasChevron({ expanded }: { expanded: boolean }) {
  const theme = useHostTheme();
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
      <path
        d={expanded ? "M2 4.5 L6 8.5 L10 4.5" : "M4.5 2 L8.5 6 L4.5 10"}
        fill="none"
        stroke={theme.text.tertiary}
        strokeWidth="1.4"
      />
    </svg>
  );
}

export function Button({
  children,
  variant = "secondary",
  disabled,
  type = "button",
  style,
  onClick,
}: {
  children?: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  style?: CSSProperties;
  onClick?: () => void;
}) {
  const theme = useHostTheme();
  const colors: CSSProperties =
    variant === "primary"
      ? { background: theme.accent.control, color: theme.text.onAccent, border: "1px solid transparent" }
      : variant === "ghost"
        ? { background: "transparent", color: theme.text.primary, border: "1px solid transparent" }
        : {
            background: theme.fill.tertiary,
            color: theme.text.primary,
            border: `1px solid ${theme.stroke.secondary}`,
          };
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      style={mergeStyle(
        {
          height: 24,
          padding: "0 10px",
          borderRadius: 6,
          fontFamily: fontStack,
          fontSize: 12,
          lineHeight: "16px",
          fontWeight: 500,
          width: "fit-content",
          cursor: disabled ? "default" : "pointer",
          opacity: disabled ? 0.5 : 1,
          ...colors,
        },
        style,
      )}
    >
      {children}
    </button>
  );
}

export function Pill({
  children,
  active = false,
  size = "md",
  leadingContent,
  keyboardHint,
  disabled,
  title,
  style,
  onClick,
}: {
  children?: ReactNode;
  active?: boolean;
  tone?: string;
  size?: "sm" | "md";
  leadingContent?: ReactNode;
  keyboardHint?: string;
  disabled?: boolean;
  title?: string;
  style?: CSSProperties;
  onClick?: () => void;
}) {
  const theme = useHostTheme();
  const compact = size === "sm";
  return (
    <button
      type="button"
      disabled={disabled}
      title={title}
      onClick={onClick}
      style={mergeStyle(
        {
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          height: compact ? 18 : 24,
          padding: compact ? "0 6px" : "0 10px",
          borderRadius: 999,
          border: compact ? "none" : `1px solid ${theme.stroke.secondary}`,
          background: active ? theme.fill.primary : "transparent",
          color: theme.text.primary,
          fontFamily: fontStack,
          fontSize: compact ? 11 : 12,
          lineHeight: "16px",
          cursor: onClick ? "pointer" : "default",
        },
        style,
      )}
    >
      {leadingContent}
      {children}
      {keyboardHint ? (
        <span style={{ color: theme.text.tertiary }}>{keyboardHint}</span>
      ) : null}
    </button>
  );
}

export function Stat({
  value,
  label,
  tone,
  style,
}: {
  value: ReactNode;
  label: string;
  tone?: "success" | "danger" | "warning" | "info";
  style?: CSSProperties;
}) {
  const theme = useHostTheme();
  return (
    <div data-stat="" style={mergeStyle({ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }, style)}>
      <div
        data-stat-value=""
        style={{
          fontFamily: fontStack,
          fontSize: 22,
          lineHeight: "28px",
          fontWeight: 590,
          color: tone ? toneColor[tone] : theme.text.primary,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontFamily: fontStack,
          fontSize: 12,
          lineHeight: "16px",
          color: theme.text.secondary,
        }}
      >
        {label}
      </div>
    </div>
  );
}

function CalloutIcon({ tone }: { tone: ChartTone }) {
  const color = toneColor[tone];
  if (tone === "success") {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="8" cy="8" r="6.25" fill="none" stroke={color} strokeWidth="1.4" />
        <path d="M5 8.2 L7.1 10.2 L11 6.2" fill="none" stroke={color} strokeWidth="1.4" />
      </svg>
    );
  }
  if (tone === "warning" || tone === "danger") {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="8" cy="8" r="6.25" fill="none" stroke={color} strokeWidth="1.4" />
        <path d="M8 4.5 V9" stroke={color} strokeWidth="1.4" />
        <circle cx="8" cy="11.2" r="0.7" fill={color} />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="6.25" fill="none" stroke={color} strokeWidth="1.4" />
      <circle cx="8" cy="5.2" r="0.7" fill={color} />
      <path d="M8 7.2 V11.5" stroke={color} strokeWidth="1.4" />
    </svg>
  );
}

export function Callout({
  children,
  tone = "info",
  title,
  icon,
  style,
}: {
  children?: ReactNode;
  tone?: ChartTone;
  title?: ReactNode;
  icon?: ReactNode;
  style?: CSSProperties;
}) {
  const theme = useHostTheme();
  return (
    <div
      data-callout=""
      style={mergeStyle(
        {
          display: "flex",
          gap: 10,
          padding: "10px 12px",
          borderRadius: 8,
          background: theme.fill.tertiary,
          color: theme.text.primary,
          fontFamily: fontStack,
        },
        style,
      )}
    >
      <span style={{ flex: "none", marginTop: 2 }}>{icon ?? <CalloutIcon tone={tone} />}</span>
      <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
        {title != null ? (
          <div style={{ fontSize: 14, lineHeight: "20px", fontWeight: 590 }}>{title}</div>
        ) : null}
        <div style={{ fontSize: 14, lineHeight: "20px", color: theme.text.secondary }}>{children}</div>
      </div>
    </div>
  );
}

const rowToneColor = {
  success: toneColor.success,
  danger: toneColor.danger,
  warning: toneColor.warning,
  info: toneColor.info,
  neutral: toneColor.neutral,
} as const;

export function Table({
  headers,
  rows,
  columnAlign,
  rowTone,
  framed = true,
  striped = false,
  stickyHeader = false,
  style,
  emptyMessage,
}: {
  headers: ReactNode[];
  rows: ReactNode[][];
  columnAlign?: Array<"left" | "center" | "right" | undefined>;
  rowTone?: Array<"success" | "danger" | "warning" | "info" | "neutral" | undefined>;
  framed?: boolean;
  striped?: boolean;
  stickyHeader?: boolean;
  style?: CSSProperties;
  emptyMessage?: ReactNode;
}) {
  const theme = useHostTheme();
  const alignOf = (index: number) => columnAlign?.[index] ?? "left";
  return (
    <div
      data-table=""
      style={mergeStyle(
        {
          border: framed ? `1px solid ${theme.stroke.primary}` : "none",
          borderRadius: framed ? 8 : 0,
          overflow: "hidden",
          background: theme.bg.editor,
        },
        style,
      )}
    >
      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: fontStack }}>
        <thead>
          <tr>
            {headers.map((header, index) => (
              <th
                key={index}
                style={{
                  textAlign: alignOf(index),
                  fontSize: 12,
                  lineHeight: "16px",
                  fontWeight: 590,
                  color: theme.text.tertiary,
                  padding: "8px 10px",
                  borderBottom: `1px solid ${theme.stroke.tertiary}`,
                  background: theme.bg.editor,
                  position: stickyHeader ? "sticky" : "static",
                  top: 0,
                  verticalAlign: "bottom",
                }}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={headers.length}
                style={{ padding: "12px 10px", color: theme.text.tertiary, fontSize: 13 }}
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                style={{
                  background:
                    striped && rowIndex % 2 === 1 ? theme.fill.quaternary : "transparent",
                }}
              >
                {headers.map((_, columnIndex) => {
                  const cell = row[columnIndex] ?? "";
                  const tone = columnIndex === 0 ? rowTone?.[rowIndex] : undefined;
                  return (
                    <td
                      key={columnIndex}
                      style={{
                        textAlign: alignOf(columnIndex),
                        fontSize: 13,
                        lineHeight: "18px",
                        color: theme.text.primary,
                        padding: "8px 10px",
                        borderBottom: `1px solid ${theme.stroke.tertiary}`,
                        verticalAlign: "top",
                        overflowWrap: "break-word",
                        fontVariantNumeric: alignOf(columnIndex) === "right" ? "tabular-nums" : "normal",
                      }}
                    >
                      {tone ? (
                        <span style={{ display: "inline-flex", alignItems: "flex-start", gap: 8 }}>
                          <span
                            data-row-tone={tone}
                            style={{
                              width: 8,
                              height: 8,
                              marginTop: 5,
                              borderRadius: 99,
                              background: rowToneColor[tone],
                              flex: "none",
                            }}
                          />
                          <span>{cell}</span>
                        </span>
                      ) : (
                        cell
                      )}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
