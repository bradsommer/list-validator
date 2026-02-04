'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import {
  getColumnHeadings,
  addColumnHeading,
  removeColumnHeading,
  updateColumnHeading,
  type ColumnHeading,
} from '@/lib/columnHeadings';

export default function ColumnHeadingsPage() {
  const [headings, setHeadings] = useState<ColumnHeading[]>([]);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  useEffect(() => {
    setHeadings(getColumnHeadings());
  }, []);

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    // Prevent duplicates
    if (headings.some((h) => h.name.toLowerCase() === trimmed.toLowerCase())) return;
    addColumnHeading(trimmed);
    setHeadings(getColumnHeadings());
    setNewName('');
  };

  const handleRemove = (id: string) => {
    removeColumnHeading(id);
    setHeadings(getColumnHeadings());
  };

  const handleStartEdit = (heading: ColumnHeading) => {
    setEditingId(heading.id);
    setEditingName(heading.name);
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    const trimmed = editingName.trim();
    if (!trimmed) return;
    updateColumnHeading(editingId, trimmed);
    setHeadings(getColumnHeadings());
    setEditingId(null);
    setEditingName('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      action();
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <p className="text-gray-600">
            Manage the column headings you use when importing lists into HubSpot. During import, you can map your spreadsheet columns to these headings so the exported file matches HubSpot's expected format.
          </p>
        </div>

        {/* Add new heading */}
        <div className="flex gap-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, handleAdd)}
            placeholder="Enter a column heading name..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          />
          <button
            onClick={handleAdd}
            disabled={!newName.trim()}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add
          </button>
        </div>

        {/* Headings list */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          {headings.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No column headings added yet. Add your first one above.
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Column Heading</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Added</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {headings.map((heading) => (
                  <tr key={heading.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      {editingId === heading.id ? (
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, handleSaveEdit)}
                          autoFocus
                          className="px-3 py-1 border border-primary-300 rounded focus:ring-2 focus:ring-primary-500 outline-none w-full max-w-sm"
                        />
                      ) : (
                        <span className="font-medium text-gray-900">{heading.name}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(heading.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {editingId === heading.id ? (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={handleSaveEdit}
                            className="px-3 py-1 text-sm bg-green-50 text-green-700 rounded hover:bg-green-100"
                          >
                            Save
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="px-3 py-1 text-sm bg-gray-50 text-gray-700 rounded hover:bg-gray-100"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleStartEdit(heading)}
                            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleRemove(heading.id)}
                            className="px-3 py-1 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="text-sm text-gray-500">
          {headings.length} column heading{headings.length !== 1 ? 's' : ''} configured
        </div>
      </div>
    </AdminLayout>
  );
}
