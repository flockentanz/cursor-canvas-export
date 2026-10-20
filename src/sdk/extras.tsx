import { useState, type CSSProperties, type ReactNode } from "react";
import { useHostTheme } from "./hooks";
import { fontStack, monoStack, toneColor, usageColorSequence } from "./tokens";
import { CanvasChevron, Card, CardBody, CardHeader, mergeStyle } from "./ui";

export function Swatch({ color, style }: { color: keyof typeof toneColor | string; style?: CSSProperties }) {
  const theme = useHostTheme();
  const fill = theme.category[color as keyof typeof theme.category] ?? theme.fill.primary;
  return (
    <span
      style={mergeStyle(
        { display: "inline-block", width: 24, height: 24, borderRadius: 4, background: fill },
        style,
      )}
    />
  );
}

export function UsageBar({
  segments,
  total,
  topLeftLabel,
  topRightLabel,
  style,
}: {
  segments: readonly { id: string; value: number; color?: string }[];
  total: number;
  topLeftLabel?: ReactNode;
  topRightLabel?: ReactNode;
  style?: CSSProperties;
}) {
  const theme = useHostTheme();
  const safeTotal = total > 0 ? total : 1;
  const used = segments.reduce((sum, segment) => sum + (Number.isFinite(segment.value) ? Math.max(0, segment.value) : 0), 0);
  return (
    <div style={mergeStyle({ display: "flex", flexDirection: "column", gap: 6 }, style)}>
      {topLeftLabel != null || topRightLabel != null ? (
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: theme.text.secondary }}>
          <span>{topLeftLabel}</span>
          <span>{topRightLabel}</span>
        </div>
      ) : null}
      <div style={{ display: "flex", height: 8, borderRadius: 99, overflow: "hidden", background: theme.fill.tertiary }}>
        {segments.map((segment, index) => {
          const key = segment.color ?? usageColorSequence[index % usageColorSequence.length];
          const color = theme.category[key as keyof typeof theme.category] ?? toneColor.info;
          const width = ((Number.isFinite(segment.value) ? Math.max(0, segment.value) : 0) / safeTotal) * 100;
          return <span key={segment.id} style={{ width: `${width}%`, background: color }} />;
        })}
        <span style={{ width: `${Math.max(0, safeTotal - used) / safeTotal * 100}%` }} />
      </div>
    </div>
  );
}

export function CollapsibleSection({
  title,
  leading,
  count,
  trailing,
  children,
  defaultOpen = false,
  style,
}: {
  title: string;
  leading?: ReactNode;
  count?: number;
  trailing?: ReactNode;
  children?: ReactNode;
  defaultOpen?: boolean;
  style?: CSSProperties;
}) {
  const theme = useHostTheme();
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={style}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          width: "100%",
          padding: "6px 0",
          border: 0,
          background: "transparent",
          color: theme.text.primary,
          fontFamily: fontStack,
          fontSize: 14,
          textAlign: "left",
          cursor: "pointer",
        }}
      >
        <CanvasChevron expanded={open} />
        {leading}
        <span style={{ fontWeight: 590 }}>{title}</span>
        {count != null ? <span style={{ color: theme.text.tertiary }}>{count}</span> : null}
        <span style={{ flex: 1 }} />
        <span style={{ color: theme.text.tertiary }}>{trailing}</span>
      </button>
      {open ? <div style={{ paddingLeft: 20 }}>{children}</div> : null}
    </div>
  );
}

export function DiffStats({
  additions = 0,
  deletions = 0,
  style,
}: {
  additions?: number;
  deletions?: number;
  style?: CSSProperties;
}) {
  if (additions === 0 && deletions === 0) return null;
  return (
    <span style={mergeStyle({ fontFamily: monoStack, fontSize: 12, fontVariantNumeric: "tabular-nums" }, style)}>
      {additions > 0 ? <span style={{ color: toneColor.success }}>+{additions}</span> : null}
      {additions > 0 && deletions > 0 ? " " : null}
      {deletions > 0 ? <span style={{ color: toneColor.danger }}>-{deletions}</span> : null}
    </span>
  );
}

export function DiffView({
  lines,
  style,
}: {
  lines: Array<{ type: "added" | "removed" | "unchanged"; content: string; lineNumber?: number }>;
  path?: string;
  language?: string;
  style?: CSSProperties;
}) {
  const theme = useHostTheme();
  const background = {
    added: theme.diff.insertedLine,
    removed: theme.diff.removedLine,
    unchanged: "transparent",
  } as const;
  return (
    <div style={mergeStyle({ fontFamily: monoStack, fontSize: 12, lineHeight: "18px" }, style)}>
      {lines.map((line, index) => (
        <div key={index} style={{ display: "flex", gap: 8, background: background[line.type], padding: "0 8px" }}>
          <span style={{ width: 32, textAlign: "right", color: theme.text.quaternary, flex: "none" }}>
            {line.lineNumber ?? index + 1}
          </span>
          <span style={{ color: line.type === "added" ? toneColor.success : line.type === "removed" ? toneColor.danger : theme.text.primary, whiteSpace: "pre-wrap" }}>
            {line.type === "added" ? "+" : line.type === "removed" ? "-" : " "}
            {line.content}
          </span>
        </div>
      ))}
    </div>
  );
}

const fieldStyle = (theme: ReturnType<typeof useHostTheme>): CSSProperties => ({
  fontFamily: fontStack,
  fontSize: 13,
  color: theme.text.primary,
  background: theme.fill.tertiary,
  border: `1px solid ${theme.stroke.secondary}`,
  borderRadius: 6,
  padding: "4px 8px",
});

export function TextInput(props: {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  type?: string;
  style?: CSSProperties;
}) {
  const theme = useHostTheme();
  return (
    <input
      value={props.value}
      placeholder={props.placeholder}
      disabled={props.disabled}
      type={props.type ?? "text"}
      onChange={(event) => props.onChange?.(event.target.value)}
      style={mergeStyle({ ...fieldStyle(theme), height: 28 }, props.style)}
    />
  );
}

export function TextArea(props: {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  rows?: number;
  style?: CSSProperties;
}) {
  const theme = useHostTheme();
  return (
    <textarea
      value={props.value}
      placeholder={props.placeholder}
      disabled={props.disabled}
      rows={props.rows ?? 4}
      onChange={(event) => props.onChange?.(event.target.value)}
      style={mergeStyle(fieldStyle(theme), props.style)}
    />
  );
}

export function Select(props: {
  value?: string;
  onChange?: (value: string) => void;
  options?: Array<{ value: string; label: string }>;
  disabled?: boolean;
  style?: CSSProperties;
}) {
  const theme = useHostTheme();
  return (
    <select
      value={props.value}
      disabled={props.disabled}
      onChange={(event) => props.onChange?.(event.target.value)}
      style={mergeStyle({ ...fieldStyle(theme), height: 28 }, props.style)}
    >
      {props.options?.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export function Checkbox(props: {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: ReactNode;
  disabled?: boolean;
  style?: CSSProperties;
}) {
  const theme = useHostTheme();
  return (
    <label style={mergeStyle({ display: "inline-flex", gap: 8, alignItems: "center", color: theme.text.primary, fontSize: 14 }, props.style)}>
      <input
        type="checkbox"
        checked={props.checked}
        disabled={props.disabled}
        onChange={(event) => props.onChange?.(event.target.checked)}
      />
      {props.label}
    </label>
  );
}

export function Toggle(props: {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  style?: CSSProperties;
}) {
  return <Checkbox checked={props.checked} onChange={props.onChange} disabled={props.disabled} style={props.style} />;
}

export function IconButton(props: {
  children?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
  style?: CSSProperties;
}) {
  const theme = useHostTheme();
  return (
    <button
      type="button"
      title={props.title}
      disabled={props.disabled}
      onClick={props.onClick}
      style={mergeStyle(
        {
          width: 24,
          height: 24,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          border: 0,
          borderRadius: 6,
          background: "transparent",
          color: theme.text.primary,
        },
        props.style,
      )}
    >
      {props.children}
    </button>
  );
}

type TodoItem = { id: string; content: string; status: "pending" | "in_progress" | "completed" | "cancelled" };

export function TodoList({
  todos,
  dimmedTodoIds,
  style,
}: {
  todos: readonly TodoItem[];
  dimmedTodoIds?: ReadonlySet<string>;
  onTodoClick?: (todo: TodoItem) => void;
  style?: CSSProperties;
}) {
  const theme = useHostTheme();
  if (todos.length === 0) return null;
  return (
    <div style={mergeStyle({ display: "flex", flexDirection: "column", gap: 6 }, style)}>
      {todos.map((todo) => (
        <div
          key={todo.id}
          style={{
            fontSize: 14,
            color: dimmedTodoIds?.has(todo.id) ? theme.text.quaternary : theme.text.primary,
            textDecoration: todo.status === "completed" || todo.status === "cancelled" ? "line-through" : "none",
          }}
        >
          {todo.content}
        </div>
      ))}
    </div>
  );
}

export function TodoListCard(props: {
  todos: readonly TodoItem[];
  dimmedTodoIds?: ReadonlySet<string>;
  defaultExpanded?: boolean;
  onTodoClick?: (todo: TodoItem) => void;
  style?: CSSProperties;
}) {
  const done = props.todos.filter((todo) => todo.status === "completed").length;
  return (
    <Card collapsible defaultOpen={props.defaultExpanded ?? true} style={props.style}>
      <CardHeader>
        {done} of {props.todos.length} Done
      </CardHeader>
      <CardBody>
        <TodoList todos={props.todos} dimmedTodoIds={props.dimmedTodoIds} onTodoClick={props.onTodoClick} />
      </CardBody>
    </Card>
  );
}

export type DAGLayoutOptions = {
  nodes: Array<{ id: string }>;
  edges: Array<{ from: string; to: string }>;
  direction?: "vertical" | "horizontal";
  nodeWidth?: number;
  nodeHeight?: number;
  rankGap?: number;
  nodeGap?: number;
  padding?: number;
};

export function computeDAGLayout(options: DAGLayoutOptions) {
  const direction = options.direction ?? "vertical";
  const nodeWidth = options.nodeWidth ?? 160;
  const nodeHeight = options.nodeHeight ?? 40;
  const rankGap = options.rankGap ?? 64;
  const nodeGap = options.nodeGap ?? 48;
  const padding = options.padding ?? 24;
  const ids = options.nodes.map((node) => node.id);
  const known = new Set(ids);
  const edges = options.edges.filter((edge) => known.has(edge.from) && known.has(edge.to));
  const outgoing = new Map<string, string[]>(ids.map((id) => [id, []]));
  for (const edge of edges) outgoing.get(edge.from)?.push(edge.to);

  const color = new Map<string, 0 | 1 | 2>(ids.map((id) => [id, 0]));
  const back = new Set<string>();
  const edgeKey = (from: string, to: string) => `${from}\0${to}`;
  const visit = (id: string) => {
    color.set(id, 1);
    for (const next of outgoing.get(id) ?? []) {
      const state = color.get(next);
      if (state === 1) back.add(edgeKey(id, next));
      else if (state === 0) visit(next);
    }
    color.set(id, 2);
  };
  for (const id of ids) if (color.get(id) === 0) visit(id);

  const incoming = new Map<string, string[]>(ids.map((id) => [id, []]));
  for (const edge of edges) {
    if (!back.has(edgeKey(edge.from, edge.to))) incoming.get(edge.to)?.push(edge.from);
  }
  const rank = new Map<string, number>();
  const ranking = (id: string): number => {
    const cached = rank.get(id);
    if (cached != null) return cached;
    const preds = incoming.get(id) ?? [];
    const value = preds.length === 0 ? 0 : Math.max(...preds.map(ranking)) + 1;
    rank.set(id, value);
    return value;
  };
  for (const id of ids) ranking(id);

  const byRank = new Map<number, string[]>();
  for (const id of ids) {
    const level = rank.get(id) ?? 0;
    const list = byRank.get(level) ?? [];
    list.push(id);
    byRank.set(level, list);
  }
  const levels = [...byRank.keys()].sort((a, b) => a - b);
  const order = new Map<string, number>();
  for (const level of levels) byRank.get(level)?.forEach((id, index) => order.set(id, index));

  const along = (level: number) => padding + level * ((direction === "vertical" ? nodeHeight : nodeWidth) + rankGap);
  const across = (index: number) => padding + index * ((direction === "vertical" ? nodeWidth : nodeHeight) + nodeGap);

  const nodes = ids.map((id) => {
    const level = rank.get(id) ?? 0;
    const index = order.get(id) ?? 0;
    const x = direction === "vertical" ? across(index) : along(level);
    const y = direction === "vertical" ? along(level) : across(index);
    return { id, x, y, rank: level, order: index };
  });
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const laidEdges = edges.map((edge) => {
    const source = nodeById.get(edge.from)!;
    const target = nodeById.get(edge.to)!;
    const vertical = direction === "vertical";
    return {
      from: edge.from,
      to: edge.to,
      sourceX: source.x + (vertical ? nodeWidth / 2 : nodeWidth),
      sourceY: source.y + (vertical ? nodeHeight : nodeHeight / 2),
      targetX: target.x + (vertical ? nodeWidth / 2 : 0),
      targetY: target.y + (vertical ? 0 : nodeHeight / 2),
      isBackEdge: back.has(edgeKey(edge.from, edge.to)),
    };
  });
  const ranks = levels.map((level) => {
    const nodeIds = byRank.get(level) ?? [];
    const first = nodeById.get(nodeIds[0])!;
    const span = Math.max(0, nodeIds.length - 1);
    const width = direction === "vertical" ? nodeWidth + span * (nodeWidth + nodeGap) : nodeWidth;
    const height = direction === "vertical" ? nodeHeight : nodeHeight + span * (nodeHeight + nodeGap);
    return { rank: level, x: first.x, y: first.y, width, height, nodeIds };
  });
  const maxAcross = Math.max(1, ...levels.map((level) => byRank.get(level)?.length ?? 1));
  const maxRank = levels.length === 0 ? 0 : Math.max(...levels);
  const width =
    padding * 2 +
    (direction === "vertical"
      ? maxAcross * nodeWidth + Math.max(0, maxAcross - 1) * nodeGap
      : (maxRank + 1) * nodeWidth + maxRank * rankGap);
  const height =
    padding * 2 +
    (direction === "vertical"
      ? (maxRank + 1) * nodeHeight + maxRank * rankGap
      : maxAcross * nodeHeight + Math.max(0, maxAcross - 1) * nodeGap);

  return { nodes, edges: laidEdges, ranks, direction, width, height };
}
