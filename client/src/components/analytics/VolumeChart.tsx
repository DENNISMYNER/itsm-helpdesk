import { Table2, TrendingUp } from 'lucide-react';
import { useId, useLayoutEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { formatDayMonth } from '../../lib/format';
import type { AnalyticsOverview } from '../../types/api';
import { Button } from '../ui/Button';

type Point = AnalyticsOverview['volume'][number];

const HEIGHT = 240;
const MARGIN = { top: 12, right: 12, bottom: 28, left: 34 };

const TICK_INTERVALS = 4;

/**
 * Picks a whole-number gridline step (1, 2, 5, 10, 20, 50 ...) so that four intervals cover
 * `value`. Counts are integers, so every gridline label must be one too - never a rounded 2.5.
 */
function niceStep(value: number): number {
  const raw = Math.max(1, value / TICK_INTERVALS);
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  return ([1, 2, 5, 10].find((candidate) => raw <= candidate * magnitude) ?? 10) * magnitude;
}

function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(640);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.max(280, Math.floor(entry.contentRect.width)));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}

function LegendItem({ color, label, total }: { color: string; label: string; total: number }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm">
      <span aria-hidden className="h-0.5 w-4 rounded-full" style={{ background: color, height: 3 }} />
      <span>{label}</span>
      <span className="tabular text-muted">{total} total</span>
    </span>
  );
}

/**
 * Created vs resolved tickets per day. Two thin lines (blue / amber, checked for colour-blind
 * separation), light grid, hover crosshair with a tooltip, and a table view for screen readers.
 */
export function VolumeChart({ data }: { data: Point[] }) {
  const [wrapper, width] = useWidth<HTMLDivElement>();
  const [view, setView] = useState<'chart' | 'table'>('chart');
  const [hover, setHover] = useState<number | null>(null);
  const titleId = useId();

  const innerW = width - MARGIN.left - MARGIN.right;
  const innerH = HEIGHT - MARGIN.top - MARGIN.bottom;

  const model = useMemo(() => {
    const step = niceStep(Math.max(...data.flatMap((point) => [point.created, point.resolved]), 0));
    const max = step * TICK_INTERVALS;
    const x = (index: number) => MARGIN.left + (data.length <= 1 ? innerW / 2 : (index / (data.length - 1)) * innerW);
    const y = (value: number) => MARGIN.top + innerH - (value / max) * innerH;
    const path = (pick: (point: Point) => number) =>
      data.map((point, index) => `${index === 0 ? 'M' : 'L'}${x(index).toFixed(1)},${y(pick(point)).toFixed(1)}`).join(' ');
    const ticks = Array.from({ length: TICK_INTERVALS + 1 }, (_, index) => index * step);
    const labelEvery = Math.max(1, Math.ceil(data.length / Math.max(2, Math.floor(innerW / 80))));
    return {
      max,
      x,
      y,
      ticks,
      labelEvery,
      created: path((point) => point.created),
      resolved: path((point) => point.resolved),
    };
  }, [data, innerW, innerH]);

  const totals = useMemo(
    () => ({
      created: data.reduce((sum, point) => sum + point.created, 0),
      resolved: data.reduce((sum, point) => sum + point.resolved, 0),
    }),
    [data],
  );

  const onMove = (event: PointerEvent<SVGRectElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width));
    setHover(Math.round(ratio * (data.length - 1)));
  };

  const hovered = hover === null ? null : (data[hover] ?? null);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
          <LegendItem color="var(--chart-a)" label="Created" total={totals.created} />
          <LegendItem color="var(--chart-b)" label="Resolved" total={totals.resolved} />
        </div>
        <Button
          variant="ghost"
          size="sm"
          icon={view === 'chart' ? <Table2 aria-hidden className="size-4" /> : <TrendingUp aria-hidden className="size-4" />}
          onClick={() => setView(view === 'chart' ? 'table' : 'chart')}
        >
          {view === 'chart' ? 'View as table' : 'View as chart'}
        </Button>
      </div>

      <div ref={wrapper} className="relative">
        {view === 'table' ? (
          <div className="max-h-72 overflow-auto rounded-md border border-line">
            <table className="w-full text-sm">
              <caption className="sr-only">Tickets created and resolved per day</caption>
              <thead className="sticky top-0 bg-subtle text-left text-xs text-muted">
                <tr>
                  <th scope="col" className="px-3 py-2 font-semibold">Day</th>
                  <th scope="col" className="px-3 py-2 text-right font-semibold">Created</th>
                  <th scope="col" className="px-3 py-2 text-right font-semibold">Resolved</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {[...data].reverse().map((point) => (
                  <tr key={point.date}>
                    <th scope="row" className="px-3 py-1.5 text-left font-normal">{formatDayMonth(point.date)}</th>
                    <td className="tabular px-3 py-1.5 text-right">{point.created}</td>
                    <td className="tabular px-3 py-1.5 text-right">{point.resolved}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <>
            <svg
              role="img"
              aria-labelledby={titleId}
              width={width}
              height={HEIGHT}
              viewBox={`0 0 ${width} ${HEIGHT}`}
              className="block max-w-full"
            >
              <title id={titleId}>
                Line chart of tickets created and resolved per day. Use "View as table" for the exact values.
              </title>

              {model.ticks.map((tick) => (
                <g key={tick}>
                  <line x1={MARGIN.left} x2={width - MARGIN.right} y1={model.y(tick)} y2={model.y(tick)} stroke="var(--line)" strokeWidth={1} />
                  <text x={MARGIN.left - 8} y={model.y(tick)} dy="0.32em" textAnchor="end" fontSize={11} fill="var(--muted)" className="tabular">
                    {tick}
                  </text>
                </g>
              ))}

              {data.map((point, index) =>
                index % model.labelEvery === 0 ? (
                  <text
                    key={point.date}
                    x={model.x(index)}
                    y={HEIGHT - 8}
                    // Keep the last labels inside the SVG instead of being clipped at the edge.
                    textAnchor={model.x(index) > width - MARGIN.right - 24 ? 'end' : 'middle'}
                    fontSize={11}
                    fill="var(--muted)"
                  >
                    {formatDayMonth(point.date)}
                  </text>
                ) : null,
              )}

              <path d={model.created} fill="none" stroke="var(--chart-a)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              <path d={model.resolved} fill="none" stroke="var(--chart-b)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

              {hovered && hover !== null ? (
                <g pointerEvents="none">
                  <line x1={model.x(hover)} x2={model.x(hover)} y1={MARGIN.top} y2={MARGIN.top + innerH} stroke="var(--line-strong)" strokeWidth={1} />
                  <circle cx={model.x(hover)} cy={model.y(hovered.created)} r={4.5} fill="var(--chart-a)" stroke="var(--panel)" strokeWidth={2} />
                  <circle cx={model.x(hover)} cy={model.y(hovered.resolved)} r={4.5} fill="var(--chart-b)" stroke="var(--panel)" strokeWidth={2} />
                </g>
              ) : null}

              {/* Wide transparent hit area: far larger than the marks it reveals. */}
              <rect
                x={MARGIN.left}
                y={MARGIN.top}
                width={innerW}
                height={innerH}
                fill="transparent"
                onPointerMove={onMove}
                onPointerLeave={() => setHover(null)}
              />
            </svg>

            {hovered && hover !== null ? (
              <div
                role="presentation"
                className="pointer-events-none absolute top-2 z-10 rounded-md border border-line bg-panel px-3 py-2 text-sm shadow-lg"
                style={{ left: Math.min(Math.max(model.x(hover) + 12, 0), width - 150) }}
              >
                <p className="font-semibold">{formatDayMonth(hovered.date)}</p>
                <p className="flex items-center gap-2">
                  <span aria-hidden className="size-2 rounded-full" style={{ background: 'var(--chart-a)' }} />
                  Created <span className="tabular ml-auto pl-3 font-semibold">{hovered.created}</span>
                </p>
                <p className="flex items-center gap-2">
                  <span aria-hidden className="size-2 rounded-full" style={{ background: 'var(--chart-b)' }} />
                  Resolved <span className="tabular ml-auto pl-3 font-semibold">{hovered.resolved}</span>
                </p>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
