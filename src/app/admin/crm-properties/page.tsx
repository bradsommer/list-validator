'use client';

import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import type { CrmObjectType, CrmFieldType } from '@/types';

interface Property {
  id: string;
  name: string;
  label: string;
  field_type: string;
  object_type: string;
  is_system: boolean;
  is_required: boolean;
  options: { value: string; label: string }[];
  sort_order: number;
}

const OBJECT_TYPES: { value: CrmObjectType; label: string }[] = [
  { value: 'contacts', label: 'Contacts' },
  { value: 'companies', label: 'Companies' },
  { value: 'deals', label: 'Deals' },
];

const FIELD_TYPES: { value: CrmFieldType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Dropdown Select' },
  { value: 'boolean', label: 'Yes/No' },
];

export default function CrmPropertiesPage() {
  const [activeType, setActiveType] = useState<CrmObjectType>('contacts');
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Form state
  const [formName, setFormName] = useState('');
  const [formLabel, setFormLabel] = useState('');
  const [formType, setFormType] = useState<CrmFieldType>('text');
  const [formRequired, setFormRequired] = useState(false);
  const [formOptions, setFormOptions] = useState('');

  const fetchProperties = async () => {
    setLoading(true);
    const res = await fetch(`/api/crm/properties?objectType=${activeType}`);
    const data = await res.json();
    if (data.success) setProperties(data.properties || []);
    setLoading(false);
  };

  useEffect(() => { fetchProperties(); }, [activeType]);

  const resetForm = () => {
    setFormName('');
    setFormLabel('');
    setFormType('text');
    setFormRequired(false);
    setFormOptions('');
    setEditingId(null);
    setShowForm(false);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const options = formType === 'select'
      ? formOptions.split('\n').filter(Boolean).map((line) => {
          const val = line.trim();
          return { value: val.toLowerCase().replace(/\s+/g, '_'), label: val };
        })
      : [];

    if (editingId) {
      const res = await fetch('/api/crm/properties', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingId,
          label: formLabel,
          fieldType: formType,
          isRequired: formRequired,
          options,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Update failed');
        return;
      }
    } else {
      const res = await fetch('/api/crm/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objectType: activeType,
          name: formName,
          label: formLabel,
          fieldType: formType,
          isRequired: formRequired,
          options,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Create failed');
        return;
      }
    }

    resetForm();
    fetchProperties();
  };

  const handleEdit = (prop: Property) => {
    setEditingId(prop.id);
    setFormName(prop.name);
    setFormLabel(prop.label);
    setFormType(prop.field_type as CrmFieldType);
    setFormRequired(prop.is_required);
    setFormOptions(prop.options?.map((o) => o.label).join('\n') || '');
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this custom property? This will not remove the data from existing records.')) return;
    const res = await fetch(`/api/crm/properties?id=${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) fetchProperties();
    else alert(data.error || 'Delete failed');
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">CRM Properties</h2>
            <p className="text-sm text-gray-500 mt-1">
              Define custom properties for contacts, companies, and deals. System properties cannot be deleted.
            </p>
          </div>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700"
          >
            Add Property
          </button>
        </div>

        {/* Object type tabs */}
        <div className="border-b border-gray-200">
          <div className="flex gap-6">
            {OBJECT_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setActiveType(t.value)}
                className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                  activeType === t.value
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Add/Edit form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="bg-gray-50 rounded-lg p-6 space-y-4">
            <h3 className="font-medium">{editingId ? 'Edit Property' : 'Add Custom Property'}</h3>

            {error && (
              <div className="bg-red-50 text-red-700 text-sm p-3 rounded">{error}</div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Internal Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. institution_id"
                  disabled={!!editingId}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100"
                />
                <p className="text-xs text-gray-400 mt-1">Snake_case, used in API. Cannot change after creation.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Display Label</label>
                <input
                  type="text"
                  value={formLabel}
                  onChange={(e) => setFormLabel(e.target.value)}
                  placeholder="e.g. Institution ID"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Field Type</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as CrmFieldType)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  {FIELD_TYPES.map((ft) => (
                    <option key={ft.value} value={ft.value}>{ft.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="formRequired"
                  checked={formRequired}
                  onChange={(e) => setFormRequired(e.target.checked)}
                />
                <label htmlFor="formRequired" className="text-sm text-gray-700">Required field</label>
              </div>
            </div>

            {formType === 'select' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Options (one per line)</label>
                <textarea
                  value={formOptions}
                  onChange={(e) => setFormOptions(e.target.value)}
                  rows={4}
                  placeholder="Option 1&#10;Option 2&#10;Option 3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            )}

            <div className="flex gap-3">
              <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700">
                {editingId ? 'Save Changes' : 'Add Property'}
              </button>
              <button type="button" onClick={resetForm} className="px-4 py-2 text-gray-600 text-sm hover:text-gray-800">
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Properties table */}
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto" />
          </div>
        ) : (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Label</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Required</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {properties.map((prop) => (
                  <tr key={prop.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-mono text-gray-700">{prop.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{prop.label}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 capitalize">{prop.field_type}</td>
                    <td className="px-4 py-3 text-sm">
                      {prop.is_required ? (
                        <span className="text-red-600 text-xs font-medium">Required</span>
                      ) : (
                        <span className="text-gray-400 text-xs">Optional</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {prop.is_system ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">System</span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">Custom</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      <button
                        onClick={() => handleEdit(prop)}
                        className="text-primary-600 hover:text-primary-800 text-sm mr-3"
                      >
                        Edit
                      </button>
                      {!prop.is_system && (
                        <button
                          onClick={() => handleDelete(prop.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
