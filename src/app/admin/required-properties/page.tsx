'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/lib/supabase';

type ObjectType = 'contacts' | 'companies' | 'deals';

interface HubSpotProperty {
  field_name: string;
  field_label: string;
  field_type: string;
  object_type: ObjectType;
}

const OBJECT_TYPE_LABELS: Record<ObjectType, string> = {
  contacts: 'Contacts',
  companies: 'Companies',
  deals: 'Deals',
};

const OBJECT_TYPE_COLORS: Record<ObjectType, string> = {
  contacts: 'bg-blue-100 text-blue-700',
  companies: 'bg-purple-100 text-purple-700',
  deals: 'bg-green-100 text-green-700',
};

export default function RequiredPropertiesPage() {
  const [properties, setProperties] = useState<HubSpotProperty[]>([]);
  const [requiredFields, setRequiredFields] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [filterObjectType, setFilterObjectType] = useState<ObjectType | 'all'>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch HubSpot properties
      const propertiesRes = await fetch('/api/hubspot/properties');
      const propertiesData = await propertiesRes.json();
      if (propertiesData.success && propertiesData.properties) {
        setProperties(propertiesData.properties);
      }

      // Fetch saved required fields from app_settings
      const { data: setting } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'required_properties')
        .single();

      if (setting?.value) {
        const parsed = typeof setting.value === 'string' ? JSON.parse(setting.value) : setting.value;
        if (Array.isArray(parsed)) {
          setRequiredFields(parsed);
        }
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleField = (fieldKey: string) => {
    setRequiredFields((prev) =>
      prev.includes(fieldKey)
        ? prev.filter((f) => f !== fieldKey)
        : [...prev, fieldKey]
    );
    setSaveMessage(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    try {
      const { error } = await supabase
        .from('app_settings')
        .upsert(
          { key: 'required_properties', value: JSON.stringify(requiredFields) },
          { onConflict: 'key' }
        );

      if (error) {
        setSaveMessage({ type: 'error', text: 'Failed to save: ' + error.message });
      } else {
        setSaveMessage({ type: 'success', text: 'Required properties saved successfully' });
      }
    } catch {
      setSaveMessage({ type: 'error', text: 'Failed to save required properties' });
    } finally {
      setIsSaving(false);
    }
  };

  // Build a unique key for each property: objectType:fieldName
  const getFieldKey = (prop: HubSpotProperty) => `${prop.object_type}:${prop.field_name}`;

  const filteredProperties = properties.filter((p) => {
    if (filterObjectType !== 'all' && p.object_type !== filterObjectType) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        p.field_name.toLowerCase().includes(q) ||
        p.field_label.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Separate required from optional for display
  const requiredProps = filteredProperties.filter((p) => requiredFields.includes(getFieldKey(p)));
  const optionalProps = filteredProperties.filter((p) => !requiredFields.includes(getFieldKey(p)));

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Required Properties</h2>
            <p className="text-sm text-gray-500 mt-1">
              Select which HubSpot properties must be mapped during import. Imports cannot
              proceed unless all required properties are matched to a spreadsheet column.
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              isSaving
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {saveMessage && (
          <div
            className={`p-3 rounded-lg text-sm ${
              saveMessage.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {saveMessage.text}
          </div>
        )}

        {/* Currently required summary */}
        {requiredFields.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-red-800 mb-2">
              Currently Required ({requiredFields.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {requiredFields.map((fieldKey) => {
                const [objType, fieldName] = fieldKey.split(':', 2);
                const prop = properties.find(
                  (p) => p.field_name === fieldName && p.object_type === objType
                );
                return (
                  <button
                    key={fieldKey}
                    onClick={() => toggleField(fieldKey)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 text-sm rounded-full bg-red-100 text-red-700 border border-red-300 hover:bg-red-200 transition-colors"
                  >
                    <span className={`inline-block w-2 h-2 rounded-full ${
                      OBJECT_TYPE_COLORS[objType as ObjectType]?.split(' ')[0] || 'bg-gray-300'
                    }`} />
                    {prop?.field_label || fieldName}
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-4 items-center">
          <div className="flex gap-2">
            <button
              onClick={() => setFilterObjectType('all')}
              className={`px-3 py-1.5 text-sm rounded-lg ${
                filterObjectType === 'all'
                  ? 'bg-gray-800 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            {(Object.keys(OBJECT_TYPE_LABELS) as ObjectType[]).map((type) => (
              <button
                key={type}
                onClick={() => setFilterObjectType(type)}
                className={`px-3 py-1.5 text-sm rounded-lg ${
                  filterObjectType === type
                    ? OBJECT_TYPE_COLORS[type]
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {OBJECT_TYPE_LABELS[type]}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search properties..."
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm flex-1 max-w-xs"
          />
        </div>

        {/* Required properties list */}
        {requiredProps.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Required ({requiredProps.length})
            </h3>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 w-10"></th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Property</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Internal Name</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Object</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {requiredProps.map((prop) => {
                    const key = getFieldKey(prop);
                    return (
                      <tr key={key} className="bg-red-50 hover:bg-red-100">
                        <td className="px-4 py-2">
                          <input
                            type="checkbox"
                            checked={true}
                            onChange={() => toggleField(key)}
                            className="w-4 h-4 text-red-600 rounded cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-2 text-sm font-medium text-gray-900">
                          {prop.field_label}
                        </td>
                        <td className="px-4 py-2 text-sm font-mono text-gray-500">
                          {prop.field_name}
                        </td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-0.5 text-xs rounded-full ${OBJECT_TYPE_COLORS[prop.object_type]}`}>
                            {OBJECT_TYPE_LABELS[prop.object_type]}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-500">{prop.field_type}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Optional properties list */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Available Properties ({optionalProps.length})
          </h3>
          <div className="border rounded-lg overflow-hidden">
            <div className="max-h-[500px] overflow-y-auto">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 w-10"></th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Property</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Internal Name</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Object</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {optionalProps.map((prop) => {
                    const key = getFieldKey(prop);
                    return (
                      <tr key={key} className="hover:bg-gray-50">
                        <td className="px-4 py-2">
                          <input
                            type="checkbox"
                            checked={false}
                            onChange={() => toggleField(key)}
                            className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-2 text-sm font-medium text-gray-900">
                          {prop.field_label}
                        </td>
                        <td className="px-4 py-2 text-sm font-mono text-gray-500">
                          {prop.field_name}
                        </td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-0.5 text-xs rounded-full ${OBJECT_TYPE_COLORS[prop.object_type]}`}>
                            {OBJECT_TYPE_LABELS[prop.object_type]}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-500">{prop.field_type}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
