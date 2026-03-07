'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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

type Granularity = 'day' | 'month' | 'year';

// ── Date helpers ──────────────────────────────────────────────────────

function formatDateRange(start: Date, end: Date): string {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
  return `${start.toLocaleDateString('en-US', opts)} - ${end.toLocaleDateString('en-US', opts)}`;
}

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

// ── Preset ranges ─────────────────────────────────────────────────────

interface RangePreset {
  label: string;
  getRange: () => { start: Date; end: Date };
}

const RANGE_PRESETS: RangePreset[] = [
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

// ── Component ─────────────────────────────────────────────────────────

export function ImportsChart() {
  // Default: last 12 months
  const defaultRange = RANGE_PRESETS[4].getRange();
  const [startDate, setStartDate] = useState<Date>(defaultRange.start);
  const [endDate, setEndDate] = useState<Date>(defaultRange.end);
  const [granularity, setGranularity] = useState<Granularity>('month');
  const [rawRows, setRawRows] = useState<{ created_at: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [granularityOpen, setGranularityOpen] = useState(false);
  const [chartWidth, setChartWidth] = useState(0);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const granularityRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
        setDatePickerOpen(false);
      }
      if (granularityRef.current && !granularityRef.current.contains(e.target as Node)) {
        setGranularityOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

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
        }
      } catch (err) {
        console.error('Failed to fetch import counts:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Aggregate data based on range + granularity
  const chartData: ChartPoint[] = useMemo(() => {
    // Filter rows to the selected date range
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

    // Build all buckets (fill gaps with 0)
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

  // Calculate tick interval based on chart width and number of data points
  const tickInterval = useMemo(() => {
    const numPoints = chartData.length;
    if (numPoints <= 1) return 0;
    // Before ResizeObserver fires, default to "preserveStartEnd" to show labels
    if (chartWidth === 0) return 'preserveStartEnd' as const;
    // Estimate ~80px per label for comfortable spacing
    const fittable = Math.max(1, Math.floor(chartWidth / 80));
    if (numPoints <= fittable) return 0; // show all
    return Math.ceil(numPoints / fittable) - 1;
  }, [chartData.length, chartWidth]);

  const handlePresetSelect = useCallback((preset: RangePreset) => {
    const { start, end } = preset.getRange();
    setStartDate(start);
    setEndDate(end);
    setDatePickerOpen(false);
  }, []);

  const granularityLabel = granularity.charAt(0).toUpperCase() + granularity.slice(1);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      {/* Header with controls */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h3 className="text-sm font-semibold text-gray-900">Imports</h3>

        <div className="flex items-center gap-2">
          {/* Date range picker */}
          <div ref={datePickerRef} className="relative">
            <button
              onClick={() => { setDatePickerOpen(!datePickerOpen); setGranularityOpen(false); }}
              className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:border-gray-400 bg-white"
            >
              <span>{formatDateRange(startDate, endDate)}</span>
              <svg className={`w-4 h-4 text-gray-400 transition-transform ${datePickerOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {datePickerOpen && (
              <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[180px]">
                {RANGE_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => handlePresetSelect(preset)}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Granularity dropdown */}
          <div ref={granularityRef} className="relative">
            <button
              onClick={() => { setGranularityOpen(!granularityOpen); setDatePickerOpen(false); }}
              className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:border-gray-400 bg-white min-w-[90px]"
            >
              <span>{granularityLabel}</span>
              <svg className={`w-4 h-4 text-gray-400 transition-transform ${granularityOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {granularityOpen && (
              <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[110px]">
                {(['day', 'month', 'year'] as Granularity[]).map((g) => (
                  <button
                    key={g}
                    onClick={() => { setGranularity(g); setGranularityOpen(false); }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                      granularity === g ? 'text-gray-900 font-medium' : 'text-gray-700'
                    }`}
                  >
                    {g.charAt(0).toUpperCase() + g.slice(1)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

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
