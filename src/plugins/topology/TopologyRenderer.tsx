import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { LoadedRenderer, RendererContext } from '../../core/renderers';
import type { TopologyGraphData, TopologyNode } from '../../core/types';
import '../enterprise-stage.css';

const NODE_W = 156;
const NODE_H = 56;

function baseNodeCoords(node: TopologyNode) {
  return {
    x: 24 + node.layer * 174,
    y: 36 + node.lane * 90,
  };
}

function statusStroke(status: TopologyNode['status']): string {
  if (status === 'degraded') return '#f97316';
  if (status === 'impacted') return '#eab308';
  return '#22c55e';
}

function TopologyStageView({ context }: { context: RendererContext<TopologyGraphData> }) {
  const graph = context.block.data;
  const [selectedId, setSelectedId] = useState<string>(
    context.focusAnchor ??
      graph.nodes.find((n) => n.status === 'degraded')?.id ??
      graph.nodes[0]?.id ??
      ''
  );
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [nodeOffsets, setNodeOffsets] = useState<Record<string, { x: number; y: number }>>({});
  const [forcedOutages, setForcedOutages] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      graph.nodes.filter((n) => n.status === 'degraded').map((n) => [n.id, true])
    )
  );
  const [search, setSearch] = useState('');
  const [syncedIncident, setSyncedIncident] = useState(false);

  const svgRef = useRef<SVGSVGElement>(null);
  const dragStateRef = useRef<
    | { mode: 'pan'; startX: number; startY: number; origX: number; origY: number }
    | { mode: 'node'; nodeId: string; startX: number; startY: number; origX: number; origY: number }
    | null
  >(null);

  useEffect(() => {
    if (context.focusAnchor && graph.nodes.some((n) => n.id === context.focusAnchor)) {
      setSelectedId(context.focusAnchor);
    }
  }, [context.focusAnchor, context.anchorPulse, graph.nodes]);

  // Live blast-radius propagation via directed BFS from any degraded/outage node
  const effectiveStatuses = useMemo(() => {
    const statusMap = new Map<string, TopologyNode['status']>();
    const queue: string[] = [];

    for (const node of graph.nodes) {
      if (forcedOutages[node.id]) {
        statusMap.set(node.id, 'degraded');
        queue.push(node.id);
      } else {
        statusMap.set(node.id, 'healthy');
      }
    }

    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const edge of graph.edges) {
        if (edge.from === current && statusMap.get(edge.to) === 'healthy') {
          statusMap.set(edge.to, 'impacted');
          queue.push(edge.to);
        }
      }
    }
    return statusMap;
  }, [forcedOutages, graph.edges, graph.nodes]);

  // Connected lineage neighborhood (ancestors + descendants of selected node)
  const connectedIds = useMemo(() => {
    const visited = new Set<string>([selectedId]);
    let changed = true;
    const upstream = new Set<string>([selectedId]);
    const downstream = new Set<string>([selectedId]);

    while (changed) {
      changed = false;
      for (const e of graph.edges) {
        if (upstream.has(e.to) && !upstream.has(e.from)) {
          upstream.add(e.from);
          visited.add(e.from);
          changed = true;
        }
        if (downstream.has(e.from) && !downstream.has(e.to)) {
          downstream.add(e.to);
          visited.add(e.to);
          changed = true;
        }
      }
    }
    return visited;
  }, [graph.edges, selectedId]);

  function getCoords(node: TopologyNode) {
    const base = baseNodeCoords(node);
    const delta = nodeOffsets[node.id];
    return { x: base.x + (delta?.x ?? 0), y: base.y + (delta?.y ?? 0) };
  }

  function toggleOutage(nodeId: string) {
    setForcedOutages((prev) => ({ ...prev, [nodeId]: !prev[nodeId] }));
    setSyncedIncident(false);
  }

  function sendIncidentBriefToLucy() {
    const degraded = graph.nodes.filter((n) => effectiveStatuses.get(n.id) === 'degraded');
    const impacted = graph.nodes.filter((n) => effectiveStatuses.get(n.id) === 'impacted');
    const summary = [
      `Degraded root source(s): ${degraded.map((n) => n.label).join(', ') || 'None (all healthy)'}`,
      `Downstream blast radius (${impacted.length} impacted): ${impacted.map((n) => n.label).join(', ') || 'None'}`,
    ];
    const nextGraph: TopologyGraphData = {
      ...graph,
      nodes: graph.nodes.map((n) => ({
        ...n,
        status: effectiveStatuses.get(n.id) ?? 'healthy',
      })),
    };
    context.onCommitRevision?.(nextGraph, summary);
    setSyncedIncident(true);
  }

  const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]));
  const selectedNode = nodeMap.get(selectedId) ?? graph.nodes[0];
  const selectedEffectiveStatus = selectedNode
    ? effectiveStatuses.get(selectedNode.id) ?? 'healthy'
    : 'healthy';
  const impactedTotal = [...effectiveStatuses.values()].filter((s) => s !== 'healthy').length;
  const searchLower = search.trim().toLowerCase();

  return (
    <div class="stage-plugin-shell">
      <div class="stage-subbar">
        <div class="stage-subbar-group">
          <span class="cell-pill tone-good">
            {graph.nodes.length - impactedTotal} Healthy
          </span>
          <span class="cell-pill tone-warn">{impactedTotal} In Blast Radius</span>
          <input
            type="search"
            class="sheet-filter-input"
            placeholder="Find service…"
            value={search}
            onInput={(e) => {
              const val = (e.currentTarget as HTMLInputElement).value;
              setSearch(val);
              const hit = graph.nodes.find((n) =>
                n.label.toLowerCase().includes(val.trim().toLowerCase())
              );
              if (val.trim() && hit) setSelectedId(hit.id);
            }}
          />
        </div>

        <div class="stage-subbar-group">
          <button
            type="button"
            class="ghost-pill"
            onClick={() => setScale((s) => Math.max(0.65, Number((s - 0.15).toFixed(2))))}
          >
            −
          </button>
          <span class="sheet-meta-count">{Math.round(scale * 100)}%</span>
          <button
            type="button"
            class="ghost-pill"
            onClick={() => setScale((s) => Math.min(1.5, Number((s + 0.15).toFixed(2))))}
          >
            +
          </button>
          <button
            type="button"
            class="ghost-pill"
            onClick={() => {
              setScale(1);
              setPan({ x: 0, y: 0 });
              setNodeOffsets({});
            }}
          >
            Reset layout
          </button>
        </div>
      </div>

      <div
        class="topology-canvas-wrap"
        onPointerDown={(e) => {
          const nodeEl = (e.target as Element).closest('[data-node-id]');
          if (nodeEl) {
            const nodeId = nodeEl.getAttribute('data-node-id')!;
            setSelectedId(nodeId);
            const curr = nodeOffsets[nodeId] ?? { x: 0, y: 0 };
            dragStateRef.current = {
              mode: 'node',
              nodeId,
              startX: e.clientX,
              startY: e.clientY,
              origX: curr.x,
              origY: curr.y,
            };
          } else {
            dragStateRef.current = {
              mode: 'pan',
              startX: e.clientX,
              startY: e.clientY,
              origX: pan.x,
              origY: pan.y,
            };
          }
        }}
        onPointerMove={(e) => {
          const drag = dragStateRef.current;
          if (!drag) return;
          const dx = e.clientX - drag.startX;
          const dy = e.clientY - drag.startY;
          if (drag.mode === 'pan') {
            setPan({ x: drag.origX + dx, y: drag.origY + dy });
          } else {
            const svgWidth = svgRef.current?.clientWidth ?? 728;
            const ratio = 728 / Math.max(280, svgWidth) / scale;
            setNodeOffsets((prev) => ({
              ...prev,
              [drag.nodeId]: { x: drag.origX + dx * ratio, y: drag.origY + dy * ratio },
            }));
          }
        }}
        onPointerUp={() => {
          dragStateRef.current = null;
        }}
        onPointerLeave={() => {
          dragStateRef.current = null;
        }}
      >
        <svg ref={svgRef} viewBox="0 0 728 300" width="100%" height="100%">
          <defs>
            <marker
              id="dagArrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 9 5 L 0 9 z" fill="#71717a" />
            </marker>
            <marker
              id="dagArrowHot"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 9 5 L 0 9 z" fill="#f97316" />
            </marker>
          </defs>

          <g transform={`translate(${pan.x} ${pan.y}) scale(${scale})`}>
            {graph.edges.map((edge) => {
              const fromNode = nodeMap.get(edge.from);
              const toNode = nodeMap.get(edge.to);
              if (!fromNode || !toNode) return null;
              const p1 = getCoords(fromNode);
              const p2 = getCoords(toNode);
              const x1 = p1.x + NODE_W;
              const y1 = p1.y + NODE_H / 2;
              const x2 = p2.x;
              const y2 = p2.y + NODE_H / 2;
              const cx = (x1 + x2) / 2;

              const sFrom = effectiveStatuses.get(fromNode.id) ?? 'healthy';
              const sTo = effectiveStatuses.get(toNode.id) ?? 'healthy';
              const isHot = sFrom !== 'healthy' && sTo !== 'healthy';
              const inLineage = connectedIds.has(fromNode.id) && connectedIds.has(toNode.id);

              return (
                <g key={`${edge.from}-${edge.to}`} opacity={inLineage ? 1 : 0.25}>
                  <path
                    class={isHot ? 'dag-hot-edge' : ''}
                    d={`M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`}
                    fill="none"
                    stroke={isHot ? '#f97316' : inLineage ? '#94a3b8' : 'rgba(255,255,255,0.2)'}
                    stroke-width={isHot ? '2.2' : '1.5'}
                    marker-end={isHot ? 'url(#dagArrowHot)' : 'url(#dagArrow)'}
                  />
                  {edge.label && (
                    <text
                      x={cx}
                      y={(y1 + y2) / 2 - 6}
                      text-anchor="middle"
                      fill={isHot ? '#fdba74' : '#94a3b8'}
                      font-size="9.5"
                    >
                      {edge.label}
                    </text>
                  )}
                </g>
              );
            })}

            {graph.nodes.map((node) => {
              const { x, y } = getCoords(node);
              const selected = node.id === selectedNode?.id;
              const effStatus = effectiveStatuses.get(node.id) ?? 'healthy';
              const stroke = statusStroke(effStatus);
              const inLineage = connectedIds.has(node.id);
              const matchesSearch =
                !searchLower || node.label.toLowerCase().includes(searchLower);

              return (
                <g
                  key={node.id}
                  data-node-id={node.id}
                  opacity={inLineage && matchesSearch ? 1 : 0.34}
                  style={{ cursor: 'grab' }}
                >
                  <rect
                    x={x}
                    y={y}
                    width={NODE_W}
                    height={NODE_H}
                    rx="10"
                    fill={selected ? '#1e1e28' : '#131319'}
                    stroke={selected ? '#ffffff' : stroke}
                    stroke-width={selected ? '2.1' : '1.4'}
                  />
                  <circle cx={x + 13} cy={y + 19} r="4.2" fill={stroke} />
                  <text x={x + 23} y={y + 22} fill="#f4f4f6" font-size="11" font-weight="600">
                    {node.label}
                  </text>
                  <text x={x + 13} y={y + 40} fill="#9ca3af" font-size="9.8">
                    {effStatus === 'healthy' ? node.latency : `${effStatus.toUpperCase()} · ${node.owner}`}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {selectedNode && (
        <div class="topology-inspector" role="region" aria-label="Selected node details">
          <div class="clause-title-row">
            <div class="stage-subbar-group">
              <strong>
                {selectedNode.label} ({selectedNode.owner})
              </strong>
              <span
                class={`cell-pill ${selectedEffectiveStatus === 'healthy' ? 'tone-good' : 'tone-warn'}`}
              >
                {selectedEffectiveStatus.toUpperCase()} · {selectedNode.latency}
              </span>
            </div>

            <div class="stage-subbar-group">
              <button
                type="button"
                class="ghost-pill"
                onClick={() => toggleOutage(selectedNode.id)}
              >
                {forcedOutages[selectedNode.id] ? 'Mark healthy' : 'Mark delayed'}
              </button>
              <button
                type="button"
                class="primary-stage-btn"
                onClick={sendIncidentBriefToLucy}
              >
                {syncedIncident ? 'Saved' : 'Save status'}
              </button>
            </div>
          </div>
          <div class="clause-footnote">{selectedNode.note}</div>
        </div>
      )}
    </div>
  );
}

export const topologyRendererModule: LoadedRenderer<preact.ComponentChildren, TopologyGraphData> = {
  render(context) {
    return <TopologyStageView context={context} />;
  },
};
