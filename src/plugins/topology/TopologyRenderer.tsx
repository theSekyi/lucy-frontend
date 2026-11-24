import { useEffect, useState } from 'preact/hooks';
import type { LoadedRenderer, RendererContext } from '../../core/renderers';
import type { TopologyGraphData, TopologyNode } from '../../core/types';
import '../enterprise-stage.css';

const NODE_W = 136;
const NODE_H = 54;

function nodeCoordinates(node: TopologyNode) {
  return {
    x: 34 + node.layer * 168,
    y: 38 + node.lane * 88,
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
    context.focusAnchor ?? graph.nodes.find((n) => n.status === 'degraded')?.id ?? graph.nodes[0]?.id ?? ''
  );
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragOrigin, setDragOrigin] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (context.focusAnchor && graph.nodes.some((n) => n.id === context.focusAnchor)) {
      setSelectedId(context.focusAnchor);
    }
  }, [context.focusAnchor, context.anchorPulse, graph.nodes]);

  const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]));
  const selectedNode = nodeMap.get(selectedId) ?? graph.nodes[0];

  return (
    <div class="stage-plugin-shell">
      <div class="stage-subbar">
        <div class="stage-subbar-group">
          <span class="cell-pill tone-good">Healthy</span>
          <span class="cell-pill tone-warn">Degraded / Impacted</span>
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
            }}
          >
            Reset
          </button>
        </div>
      </div>

      <div
        class="topology-canvas-wrap"
        onPointerDown={(e) => {
          if ((e.target as Element).closest('[data-node-id]')) return;
          setDragOrigin({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        }}
        onPointerMove={(e) => {
          if (!dragOrigin) return;
          setPan({ x: e.clientX - dragOrigin.x, y: e.clientY - dragOrigin.y });
        }}
        onPointerUp={() => setDragOrigin(null)}
        onPointerLeave={() => setDragOrigin(null)}
      >
        <svg viewBox="0 0 700 300" width="100%" height="100%">
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
          </defs>

          <g transform={`translate(${pan.x} ${pan.y}) scale(${scale})`}>
            {graph.edges.map((edge) => {
              const fromNode = nodeMap.get(edge.from);
              const toNode = nodeMap.get(edge.to);
              if (!fromNode || !toNode) return null;
              const p1 = nodeCoordinates(fromNode);
              const p2 = nodeCoordinates(toNode);
              const x1 = p1.x + NODE_W;
              const y1 = p1.y + NODE_H / 2;
              const x2 = p2.x;
              const y2 = p2.y + NODE_H / 2;
              const cx = (x1 + x2) / 2;
              const isHot = fromNode.status !== 'healthy' && toNode.status !== 'healthy';

              return (
                <g key={`${edge.from}-${edge.to}`}>
                  <path
                    d={`M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`}
                    fill="none"
                    stroke={isHot ? '#f97316' : 'rgba(255,255,255,0.22)'}
                    stroke-width={isHot ? '2' : '1.4'}
                    marker-end="url(#dagArrow)"
                  />
                  {edge.label && (
                    <text
                      x={cx}
                      y={(y1 + y2) / 2 - 6}
                      text-anchor="middle"
                      fill={isHot ? '#fdba74' : '#8e8e98'}
                      font-size="9.5"
                    >
                      {edge.label}
                    </text>
                  )}
                </g>
              );
            })}

            {graph.nodes.map((node) => {
              const { x, y } = nodeCoordinates(node);
              const selected = node.id === selectedNode?.id;
              const stroke = statusStroke(node.status);

              return (
                <g
                  key={node.id}
                  data-node-id={node.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedId(node.id)}
                >
                  <rect
                    x={x}
                    y={y}
                    width={NODE_W}
                    height={NODE_H}
                    rx="9"
                    fill={selected ? '#1d1d24' : '#131318'}
                    stroke={selected ? '#f4f4f6' : stroke}
                    stroke-width={selected ? '2' : '1.3'}
                  />
                  <circle cx={x + 13} cy={y + 18} r="4" fill={stroke} />
                  <text x={x + 23} y={y + 21} fill="#f4f4f6" font-size="11" font-weight="600">
                    {node.label}
                  </text>
                  <text x={x + 13} y={y + 39} fill="#8e8e98" font-size="10">
                    {node.latency} · {node.owner}
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
            <strong>
              {selectedNode.label} ({selectedNode.owner})
            </strong>
            <span
              class={`cell-pill ${selectedNode.status === 'healthy' ? 'tone-good' : 'tone-warn'}`}
            >
              {selectedNode.status.toUpperCase()} · {selectedNode.latency}
            </span>
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
