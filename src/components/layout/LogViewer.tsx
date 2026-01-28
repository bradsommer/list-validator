'use client';

import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { exportLogsAsJson, exportLogsAsCsv } from '@/lib/logger';

export function LogViewer() {
  const { logs } = useAppStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);

  const filteredLogs = filter ? logs.filter((log) => log.level === filter) : logs;

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'success':
        return 'text-green-600 bg-green-50';
      case 'error':
        return 'text-red-600 bg-red-50';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50';
      default:
        return 'text-blue-600 bg-blue-50';
    }
  };

  const handleExport = (format: 'json' | 'csv') => {
    const content = format === 'json' ? exportLogsAsJson(logs) : exportLogsAsCsv(logs);
    const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `logs_${new Date().toISOString()}.${format}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="fixed bottom-4 right-4 px-4 py-2 bg-gray-800 text-white rounded-lg shadow-lg hover:bg-gray-700 flex items-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
        Logs ({logs.length})
      </button>
    );
  }

  return (
    <div className="fixed bottom-0 right-0 w-full md:w-[500px] h-[400px] bg-white border-t border-l border-gray-200 shadow-xl rounded-tl-lg flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50">
        <h3 className="font-medium">Activity Log</h3>
        <div className="flex items-center gap-2">
          <select
            value={filter || ''}
            onChange={(e) => setFilter(e.target.value || null)}
            className="text-sm px-2 py-1 border border-gray-300 rounded"
          >
            <option value="">All</option>
            <option value="info">Info</option>
            <option value="success">Success</option>
            <option value="warning">Warning</option>
            <option value="error">Error</option>
          </select>
          <button
            onClick={() => handleExport('json')}
            className="text-xs px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
          >
            JSON
          </button>
          <button
            onClick={() => handleExport('csv')}
            className="text-xs px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
          >
            CSV
          </button>
          <button
            onClick={() => setIsExpanded(false)}
            className="p-1 hover:bg-gray-200 rounded"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Log entries */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 font-mono text-xs">
        {filteredLogs.length === 0 ? (
          <div className="text-center text-gray-400 py-8">No logs yet</div>
        ) : (
          filteredLogs.map((log) => (
            <div
              key={log.id}
              className={`p-2 rounded ${getLevelColor(log.level)}`}
            >
              <div className="flex items-start gap-2">
                <span className="text-gray-400 whitespace-nowrap">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span className="uppercase font-bold w-16">[{log.step}]</span>
                <span className="flex-1">{log.message}</span>
              </div>
              {log.details && (
                <pre className="mt-1 text-[10px] text-gray-500 overflow-x-auto">
                  {JSON.stringify(log.details, null, 2)}
                </pre>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
