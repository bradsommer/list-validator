'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { supabase } from '@/lib/supabase';

interface ChartPoint {
  key: string;
  label: string;
  count: number;
}

export type Granularity = 'day' | 'month' | 'year';

// ── Date helpers ──────────────────────────────────────────────────────

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function yearKey(d: Date): string {
  return `${d.getFullYear()}`;
}

function dayLabel(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function monthLabel(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function yearLabel(d: Date): string {
  return `${d.getFullYear()}`;
}

// ── Preset ranges (exported for use in Dashboard) ────────────────────

export interface RangePreset {
  label: string;
  getRange: () => { start: Date; end: Date };
}

export const RANGE_PRESETS: RangePreset[] = [
  {
    label: 'Last 7 days',
    getRange: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 6);
      return { start, end };
    },
  },
  {
    label: 'Last 30 days',
    getRange: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 29);
      return { start, end };
    },
  },
  {
    label: 'Last 3 months',
    getRange: () => {
      const end = new Date();
      const start = new Date(end.getFullYear(), end.getMonth() - 2, 1);
      return { start, end };
    },
  },
  {
    label: 'Last 6 months',
    getRange: () => {
      const end = new Date();
      const start = new Date(end.getFullYear(), end.getMonth() - 5, 1);
      return { start, end };
    },
  },
  {
    label: 'Last 12 months',
    getRange: () => {
      const end = new Date();
      const start = new Date(end.getFullYear(), end.getMonth() - 11, 1);
      return { start, end };
    },
  },
  {
    label: 'Last 24 months',
    getRange: () => {
      const end = new Date();
      const start = new Date(end.getFullYear(), end.getMonth() - 23, 1);
      return { start, end };
    },
  },
  {
    label: 'Year to date',
    getRange: () => {
      const end = new Date();
      const start = new Date(end.getFullYear(), 0, 1);
      return { start, end };
    },
  },
];

export const DEFAULT_RANGE_INDEX = 4; // Last 12 months

// ── Component ─────────────────────────────────────────────────────────

interface ImportsChartProps {
  startDate: Date;
  endDate: Date;
  granularity: Granularity;
  onRawRowsChange?: (rows: { created_at: string }[]) => void;
}

export function ImportsChart({ startDate, endDate, granularity, onRawRowsChange }: ImportsChartProps) {
  const [rawRows, setRawRows] = useState<{ created_at: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [chartWidth, setChartWidth] = useState(0);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Track chart container width for responsive tick calculation
  useEffect(() => {
    const el = chartContainerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setChartWidth(entry.contentRect.width);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Fetch all data once (wide range)
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const wideStart = new Date();
        wideStart.setFullYear(wideStart.getFullYear() - 3);
        const { data, error } = await supabase
          .from('upload_sessions')
          .select('created_at')
          .gte('created_at', wideStart.toISOString())
          .order('created_at', { ascending: true });

        if (!error && data) {
          setRawRows(data);
          onRawRowsChange?.(data);
        }
      } catch (err) {
        console.error('Failed to fetch import counts:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Aggregate data based on range + granularity
  const chartData: ChartPoint[] = useMemo(() => {
    const rangeStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    rangeStart.setHours(0, 0, 0, 0);
    const rangeEnd = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    rangeEnd.setHours(23, 59, 59, 999);

    const counts: Record<string, number> = {};
    for (const row of rawRows) {
      const d = new Date(row.created_at);
      if (d < rangeStart || d > rangeEnd) continue;
      const k = granularity === 'day' ? dayKey(d) : granularity === 'year' ? yearKey(d) : monthKey(d);
      counts[k] = (counts[k] || 0) + 1;
    }

    const points: ChartPoint[] = [];

    if (granularity === 'day') {
      const cursor = new Date(rangeStart);
      while (cursor <= rangeEnd) {
        const k = dayKey(cursor);
        points.push({ key: k, label: dayLabel(cursor), count: counts[k] || 0 });
        cursor.setDate(cursor.getDate() + 1);
      }
    } else if (granularity === 'month') {
      const cursor = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
      const last = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), 1);
      while (cursor <= last) {
        const k = monthKey(cursor);
        points.push({ key: k, label: monthLabel(cursor), count: counts[k] || 0 });
        cursor.setMonth(cursor.getMonth() + 1);
      }
    } else {
      const startYear = rangeStart.getFullYear();
      const endYear = rangeEnd.getFullYear();
      for (let y = startYear; y <= endYear; y++) {
        const k = `${y}`;
        points.push({ key: k, label: yearLabel(new Date(y, 0, 1)), count: counts[k] || 0 });
      }
    }

    return points;
  }, [startDate, endDate, granularity, rawRows]);

  const maxCount = useMemo(
    () => Math.max(...chartData.map((d) => d.count), 1),
    [chartData],
  );

  const tickInterval = useMemo(() => {
    const numPoints = chartData.length;
    if (numPoints <= 1) return 0;
    const effectiveWidth = chartWidth || 600;
    const fittable = Math.max(1, Math.floor(effectiveWidth / 80));
    if (numPoints <= fittable) return 0;
    return Math.ceil(numPoints / fittable) - 1;
  }, [chartData.length, chartWidth]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Imports</h3>

      {/* Chart */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64 text-gray-400">
          <div className="animate-spin w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <div ref={chartContainerRef} className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12, fill: '#6b7280' }}
                tickLine={false}
                axisLine={{ stroke: '#e5e7eb' }}
                interval={tickInterval}
                dy={8}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 12, fill: '#6b7280' }}
                tickLine={false}
                axisLine={false}
                domain={[0, Math.ceil(maxCount * 1.1) || 1]}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  fontSize: 13,
                  borderRadius: 8,
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
                formatter={(value: unknown) => [String(value), 'Imports']}
                labelFormatter={(label: unknown) => String(label)}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#0B8377"
                strokeWidth={2}
                dot={chartData.length <= 60 ? { r: 4, fill: '#0B8377', strokeWidth: 2, stroke: '#fff' } : false}
                activeDot={{ r: 6, fill: '#0B8377', strokeWidth: 2, stroke: '#fff' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
