'use client';

import { useState, useEffect, useMemo } from 'react';
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

interface MonthData {
  month: string;
  label: string;
  count: number;
}

type DateRange = '6m' | '12m' | '24m';

const RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: '6m', label: '6 months' },
  { value: '12m', label: '12 months' },
  { value: '24m', label: '24 months' },
];

function getMonthsInRange(range: DateRange): { start: Date; months: number } {
  const now = new Date();
  const monthsBack = range === '6m' ? 5 : range === '12m' ? 11 : 23;
  const start = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
  return { start, months: monthsBack + 1 };
}

function formatMonthLabel(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function formatMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function ImportsChart() {
  const [range, setRange] = useState<DateRange>('12m');
  const [rawCounts, setRawCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchImportCounts = async () => {
      setIsLoading(true);
      try {
        // Fetch with widest possible range so we can switch without refetching
        const { start } = getMonthsInRange('24m');
        const { data, error } = await supabase
          .from('upload_sessions')
          .select('created_at')
          .gte('created_at', start.toISOString())
          .order('created_at', { ascending: true });

        if (!error && data) {
          const counts: Record<string, number> = {};
          for (const row of data) {
            const d = new Date(row.created_at);
            const key = formatMonthKey(d);
            counts[key] = (counts[key] || 0) + 1;
          }
          setRawCounts(counts);
        }
      } catch (err) {
        console.error('Failed to fetch import counts:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchImportCounts();
  }, []);

  const chartData: MonthData[] = useMemo(() => {
    const { start, months } = getMonthsInRange(range);
    const data: MonthData[] = [];
    for (let i = 0; i < months; i++) {
      const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
      const key = formatMonthKey(d);
      data.push({
        month: key,
        label: formatMonthLabel(d),
        count: rawCounts[key] || 0,
      });
    }
    return data;
  }, [range, rawCounts]);

  const maxCount = useMemo(
    () => Math.max(...chartData.map((d) => d.count), 1),
    [chartData],
  );

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900">Imports per Month</h3>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setRange(opt.value)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                range === opt.value
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64 text-gray-400">
          <div className="animate-spin w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12, fill: '#6b7280' }}
                tickLine={false}
                axisLine={{ stroke: '#e5e7eb' }}
                interval={range === '24m' ? 2 : 0}
                angle={range === '24m' ? -45 : 0}
                textAnchor={range === '24m' ? 'end' : 'middle'}
                height={range === '24m' ? 60 : 30}
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
                stroke="#4f46e5"
                strokeWidth={2}
                dot={{ r: 4, fill: '#4f46e5', strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 6, fill: '#4f46e5', strokeWidth: 2, stroke: '#fff' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
