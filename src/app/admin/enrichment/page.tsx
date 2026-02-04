'use client';

import { useState, useEffect, useRef } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/lib/supabase';
import type { HubSpotObjectType } from '@/types';

interface AIModel {
  id: string;
  name: string;
  provider: string;
  model_id: string;
  is_active: boolean;
}

interface HubSpotProperty {
  name: string;
  label: string;
  objectType: HubSpotObjectType;
}

interface InputField {
  objectType: HubSpotObjectType;
  propertyName: string;
  propertyLabel: string;
}

interface OutputField {
  id: string;
  type: OutputFieldType;
}

type OutputFieldType = 'string' | 'number' | 'boolean' | 'datetime' | 'enumeration' | 'date' | 'phone_number';

interface EnrichmentConfig {
  id: string;
  name: string;
  description: string | null;
  ai_model_id: string | null;
  ai_model?: AIModel;
  prompt_template: string;
  input_fields: string[];
  output_field: string;
  is_enabled: boolean;
  execution_order: number;
  created_at: string;
}

const OBJECT_TYPES: { value: HubSpotObjectType; label: string }[] = [
  { value: 'contacts', label: 'Contacts' },
  { value: 'companies', label: 'Companies' },
  { value: 'deals', label: 'Deals' },
];

const OBJECT_TYPE_COLORS: Record<HubSpotObjectType, string> = {
  contacts: 'bg-blue-100 text-blue-700 border-blue-200',
  companies: 'bg-purple-100 text-purple-700 border-purple-200',
  deals: 'bg-green-100 text-green-700 border-green-200',
};

const OUTPUT_FIELD_TYPES: { value: OutputFieldType; label: string }[] = [
  { value: 'string', label: 'String' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'datetime', label: 'Datetime' },
  { value: 'date', label: 'Date' },
  { value: 'enumeration', label: 'Enumeration' },
  { value: 'phone_number', label: 'Phone Number' },
];

const OUTPUT_TYPE_LABELS: Record<OutputFieldType, string> = {
  string: 'String',
  number: 'Number',
  boolean: 'Boolean',
  datetime: 'Datetime',
  date: 'Date',
  enumeration: 'Enum',
  phone_number: 'Phone',
};

// Parse output_field from DB — handles both legacy single string and new JSON array format
function parseOutputFields(raw: string): OutputField[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // Not JSON — legacy single string field
  }
  return [{ id: raw, type: 'string' }];
}

// Serialize output fields to DB string
function serializeOutputFields(fields: OutputField[]): string {
  if (fields.length === 0) return '';
  return JSON.stringify(fields);
}

export default function EnrichmentPage() {
  const [configs, setConfigs] = useState<EnrichmentConfig[]>([]);
  const [aiModels, setAiModels] = useState<AIModel[]>([]);
  const [hubspotProperties, setHubspotProperties] = useState<HubSpotProperty[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState<EnrichmentConfig | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    ai_model_id: '',
    prompt_template: '',
    input_fields: [] as InputField[],
    output_fields: [] as OutputField[],
    execution_order: 0,
  });
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Field picker state
  const [pickerObjectType, setPickerObjectType] = useState<HubSpotObjectType>('contacts');
  const [pickerProperty, setPickerProperty] = useState('');

  // Output field picker state
  const [outputFieldId, setOutputFieldId] = useState('');
  const [outputFieldType, setOutputFieldType] = useState<OutputFieldType>('string');

  // Prompt textarea ref for cursor insertion
  const promptRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [configsRes, modelsRes, propertiesRes] = await Promise.all([
        supabase.from('enrichment_configs').select('*, ai_model:ai_models(*)').order('execution_order'),
        supabase.from('ai_models').select('*').eq('is_active', true),
        fetch('/api/hubspot/properties').then((r) => r.json()),
      ]);

      setConfigs(configsRes.data || []);
      setAiModels(modelsRes.data || []);

      if (propertiesRes.success && propertiesRes.properties) {
        const mapped: HubSpotProperty[] = propertiesRes.properties.map(
          (p: { field_name: string; field_label: string; object_type: string }) => ({
            name: p.field_name,
            label: p.field_label,
            objectType: p.object_type as HubSpotObjectType,
          })
        );
        setHubspotProperties(mapped);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      ai_model_id: '',
      prompt_template: '',
      input_fields: [],
      output_fields: [],
      execution_order: configs.length * 10 + 10,
    });
    setFormError('');
    setEditingConfig(null);
    setPickerObjectType('contacts');
    setPickerProperty('');
    setOutputFieldId('');
    setOutputFieldType('string');
  };

  const openAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  // Parse stored input_fields strings back into InputField objects
  const parseInputFields = (fields: string[]): InputField[] => {
    return fields.map((f) => {
      const [objectType, propertyName] = f.includes(':') ? f.split(':', 2) : ['contacts', f];
      const prop = hubspotProperties.find(
        (p) => p.name === propertyName && p.objectType === objectType
      );
      return {
        objectType: (objectType as HubSpotObjectType) || 'contacts',
        propertyName,
        propertyLabel: prop?.label || propertyName,
      };
    });
  };

  const serializeInputFields = (fields: InputField[]): string[] => {
    return fields.map((f) => `${f.objectType}:${f.propertyName}`);
  };

  const openEditModal = (config: EnrichmentConfig) => {
    setEditingConfig(config);
    const parsedFields = parseInputFields(config.input_fields);
    const parsedOutputs = parseOutputFields(config.output_field);
    setFormData({
      name: config.name,
      description: config.description || '',
      ai_model_id: config.ai_model_id || '',
      prompt_template: config.prompt_template,
      input_fields: parsedFields,
      output_fields: parsedOutputs,
      execution_order: config.execution_order,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.prompt_template || formData.output_fields.length === 0) {
      setFormError('Name, prompt template, and at least one output field are required');
      return;
    }

    setIsSaving(true);
    setFormError('');

    try {
      const data = {
        name: formData.name,
        description: formData.description || null,
        ai_model_id: formData.ai_model_id || null,
        prompt_template: formData.prompt_template,
        input_fields: serializeInputFields(formData.input_fields),
        output_field: serializeOutputFields(formData.output_fields),
        execution_order: formData.execution_order,
      };

      if (editingConfig) {
        await supabase.from('enrichment_configs').update(data).eq('id', editingConfig.id);
      } else {
        await supabase.from('enrichment_configs').insert(data);
      }

      setShowModal(false);
      resetForm();
      fetchData();
    } catch {
      setFormError('Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this enrichment configuration?')) return;

    try {
      await supabase.from('enrichment_configs').delete().eq('id', id);
      fetchData();
    } catch (err) {
      console.error('Error deleting config:', err);
    }
  };

  const toggleEnabled = async (config: EnrichmentConfig) => {
    try {
      await supabase
        .from('enrichment_configs')
        .update({ is_enabled: !config.is_enabled })
        .eq('id', config.id);
      fetchData();
    } catch (err) {
      console.error('Error toggling config:', err);
    }
  };

  const addInputField = () => {
    if (!pickerProperty) return;

    const exists = formData.input_fields.some(
      (f) => f.objectType === pickerObjectType && f.propertyName === pickerProperty
    );
    if (exists) return;

    const prop = filteredProperties.find((p) => p.name === pickerProperty);
    const newField: InputField = {
      objectType: pickerObjectType,
      propertyName: pickerProperty,
      propertyLabel: prop?.label || pickerProperty,
    };

    setFormData((prev) => ({
      ...prev,
      input_fields: [...prev.input_fields, newField],
    }));
    setPickerProperty('');
  };

  const removeInputField = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      input_fields: prev.input_fields.filter((_, i) => i !== index),
    }));
  };

  const addOutputField = () => {
    if (!outputFieldId.trim()) return;

    const exists = formData.output_fields.some((f) => f.id === outputFieldId.trim());
    if (exists) return;

    setFormData((prev) => ({
      ...prev,
      output_fields: [...prev.output_fields, { id: outputFieldId.trim(), type: outputFieldType }],
    }));
    setOutputFieldId('');
    setOutputFieldType('string');
  };

  const removeOutputField = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      output_fields: prev.output_fields.filter((_, i) => i !== index),
    }));
  };

  const insertShortcode = (field: InputField) => {
    const shortcode = `[${field.propertyName}]`;
    const textarea = promptRef.current;

    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = formData.prompt_template;
      const newText = text.substring(0, start) + shortcode + text.substring(end);

      setFormData((prev) => ({ ...prev, prompt_template: newText }));

      requestAnimationFrame(() => {
        textarea.focus();
        textarea.selectionStart = textarea.selectionEnd = start + shortcode.length;
      });
    } else {
      setFormData((prev) => ({
        ...prev,
        prompt_template: prev.prompt_template + shortcode,
      }));
    }
  };

  // Filter properties by selected object type in the picker
  const filteredProperties = hubspotProperties
    .filter((p) => p.objectType === pickerObjectType)
    .sort((a, b) => a.label.localeCompare(b.label));

  const getFieldDisplay = (field: InputField) => {
    return `${field.propertyLabel}`;
  };

  // Render shortcodes in prompt template with highlighting
  const renderPromptPreview = (template: string) => {
    const parts = template.split(/(\[[^\]]+\])/g);
    return parts.map((part, i) => {
      if (part.match(/^\[[^\]]+\]$/)) {
        return (
          <span key={i} className="bg-primary-100 text-primary-700 px-1 rounded font-semibold">
            {part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  // Format the stored input_fields for display on the config card
  const formatStoredFields = (fields: string[]) => {
    return fields.map((f) => {
      const [objectType, propertyName] = f.includes(':') ? f.split(':', 2) : ['contacts', f];
      const prop = hubspotProperties.find(
        (p) => p.name === propertyName && p.objectType === objectType
      );
      return {
        objectType: objectType as HubSpotObjectType,
        propertyName,
        label: prop?.label || propertyName,
      };
    });
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Enrichment Configuration</h2>
            <p className="text-gray-500 text-sm mt-1">
              Configure data enrichment actions with AI models. Add input fields from HubSpot
              and insert <code className="bg-gray-100 px-1 rounded">[shortcodes]</code> into
              prompts to reference property values.
            </p>
          </div>
          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Add Enrichment
          </button>
        </div>

        {/* HubSpot connection warning */}
        {hubspotProperties.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
            <svg className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.27 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-yellow-900">HubSpot Not Connected</h4>
              <p className="text-sm text-yellow-700 mt-1">
                Connect HubSpot and sync properties in{' '}
                <a href="/admin/integrations" className="underline font-medium">Integrations</a>{' '}
                to populate the property dropdowns.
              </p>
            </div>
          </div>
        )}

        {/* Configs list */}
        <div className="space-y-4">
          {configs.map((config) => {
            const fields = formatStoredFields(config.input_fields);
            const outputFields = parseOutputFields(config.output_field);

            return (
              <div
                key={config.id}
                className="bg-white rounded-lg border border-gray-200 overflow-hidden"
              >
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-medium text-gray-900">{config.name}</h3>
                        {!config.is_enabled && (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                            Disabled
                          </span>
                        )}
                      </div>
                      {config.description && (
                        <p className="text-sm text-gray-600 mt-1">{config.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <span>
                          AI Model: {config.ai_model?.name || 'Default'}
                        </span>
                        <span>Order: {config.execution_order}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleEnabled(config)}
                        className={`text-sm ${
                          config.is_enabled ? 'text-orange-600' : 'text-green-600'
                        }`}
                      >
                        {config.is_enabled ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        onClick={() => openEditModal(config)}
                        className="text-sm text-primary-600 hover:text-primary-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(config.id)}
                        className="text-sm text-red-600 hover:text-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Prompt preview */}
                  <div className="mt-4 bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">Prompt Template:</div>
                    <code className="text-sm text-gray-700 whitespace-pre-wrap">
                      {renderPromptPreview(config.prompt_template)}
                    </code>
                  </div>

                  {/* Input fields */}
                  {fields.length > 0 && (
                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-gray-500">Input fields:</span>
                      {fields.map((field, i) => (
                        <span
                          key={i}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded border ${OBJECT_TYPE_COLORS[field.objectType]}`}
                        >
                          <span className="opacity-60 capitalize">{field.objectType}:</span>
                          {field.label}
                          <span className="opacity-50 font-mono ml-1">[{field.propertyName}]</span>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Output fields */}
                  {outputFields.length > 0 && (
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-gray-500">Output fields:</span>
                      {outputFields.map((field, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs rounded border bg-orange-50 text-orange-700 border-orange-200"
                        >
                          <code>{field.id}</code>
                          <span className="opacity-60">{OUTPUT_TYPE_LABELS[field.type] || field.type}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {configs.length === 0 && (
            <div className="text-center py-12 text-gray-500 bg-white rounded-lg border border-gray-200">
              No enrichment configurations. Add one to enable AI-powered data enrichment.
            </div>
          )}
        </div>

        {/* Add/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {editingConfig ? 'Edit Enrichment' : 'Add Enrichment'}
                </h3>

                <div className="space-y-4">
                  {formError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                      {formError}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                        placeholder="e.g., Find Company Domain"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        AI Model
                      </label>
                      <select
                        value={formData.ai_model_id}
                        onChange={(e) => setFormData({ ...formData, ai_model_id: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                      >
                        <option value="">Use Default</option>
                        {aiModels.map((model) => (
                          <option key={model.id} value={model.id}>
                            {model.name} ({model.provider}/{model.model_id})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <input
                      type="text"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                      placeholder="Optional description..."
                    />
                  </div>

                  {/* Input Fields - Object Type + Property Picker */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Input Fields
                    </label>
                    <p className="text-xs text-gray-500 mb-2">
                      Select a HubSpot object and property, then add it. Click a field&apos;s shortcode to insert it into the prompt.
                    </p>

                    {/* Picker row */}
                    <div className="flex items-center gap-2">
                      <select
                        value={pickerObjectType}
                        onChange={(e) => {
                          setPickerObjectType(e.target.value as HubSpotObjectType);
                          setPickerProperty('');
                        }}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm"
                      >
                        {OBJECT_TYPES.map((ot) => (
                          <option key={ot.value} value={ot.value}>{ot.label}</option>
                        ))}
                      </select>

                      <select
                        value={pickerProperty}
                        onChange={(e) => setPickerProperty(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm"
                      >
                        <option value="">Select a property...</option>
                        {filteredProperties.map((prop) => (
                          <option key={prop.name} value={prop.name}>
                            {prop.label} ({prop.name})
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={addInputField}
                        disabled={!pickerProperty}
                        className="px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-medium whitespace-nowrap"
                      >
                        Add
                      </button>
                    </div>

                    {/* Added fields list */}
                    {formData.input_fields.length > 0 && (
                      <div className="mt-3 space-y-1.5">
                        {formData.input_fields.map((field, index) => (
                          <div
                            key={index}
                            className={`flex items-center justify-between px-3 py-2 rounded-lg border ${OBJECT_TYPE_COLORS[field.objectType]}`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium capitalize opacity-70">
                                {field.objectType}
                              </span>
                              <span className="text-sm font-medium">
                                {getFieldDisplay(field)}
                              </span>
                              <button
                                type="button"
                                onClick={() => insertShortcode(field)}
                                className="ml-1 px-1.5 py-0.5 bg-white bg-opacity-60 hover:bg-opacity-100 rounded text-xs font-mono transition-colors"
                                title="Click to insert shortcode into prompt"
                              >
                                [{field.propertyName}]
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeInputField(index)}
                              className="text-sm opacity-60 hover:opacity-100 ml-2"
                              title="Remove field"
                            >
                              &times;
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {formData.input_fields.length === 0 && (
                      <p className="mt-2 text-xs text-gray-400 italic">
                        No input fields added yet. Add fields above to use them as shortcodes in your prompt.
                      </p>
                    )}
                  </div>

                  {/* Prompt Template */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Prompt Template
                    </label>
                    <textarea
                      ref={promptRef}
                      value={formData.prompt_template}
                      onChange={(e) =>
                        setFormData({ ...formData, prompt_template: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none font-mono text-sm"
                      rows={4}
                      placeholder="Enter your prompt template. Click a field's shortcode above to insert it, e.g. [company] [city]"
                    />
                    {formData.input_fields.length > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        Available shortcodes:{' '}
                        {formData.input_fields.map((f, i) => (
                          <span key={i}>
                            {i > 0 && ', '}
                            <button
                              type="button"
                              onClick={() => insertShortcode(f)}
                              className="font-mono text-primary-600 hover:underline"
                            >
                              [{f.propertyName}]
                            </button>
                          </span>
                        ))}
                      </p>
                    )}
                  </div>

                  {/* Output Fields */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Output Fields
                    </label>
                    <p className="text-xs text-gray-500 mb-2">
                      Define the fields where enrichment results will be stored. Set an ID and a data type for each.
                    </p>

                    {/* Output field picker row */}
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={outputFieldId}
                        onChange={(e) => setOutputFieldId(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addOutputField();
                          }
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm font-mono"
                        placeholder="e.g., official_company_name"
                      />

                      <select
                        value={outputFieldType}
                        onChange={(e) => setOutputFieldType(e.target.value as OutputFieldType)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm"
                      >
                        {OUTPUT_FIELD_TYPES.map((ft) => (
                          <option key={ft.value} value={ft.value}>{ft.label}</option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={addOutputField}
                        disabled={!outputFieldId.trim()}
                        className="px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-medium whitespace-nowrap"
                      >
                        Add
                      </button>
                    </div>

                    {/* Added output fields list */}
                    {formData.output_fields.length > 0 && (
                      <div className="mt-3 space-y-1.5">
                        {formData.output_fields.map((field, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between px-3 py-2 rounded-lg border bg-orange-50 border-orange-200 text-orange-700"
                          >
                            <div className="flex items-center gap-3">
                              <code className="text-sm font-medium">{field.id}</code>
                              <span className="text-xs px-1.5 py-0.5 rounded bg-orange-100 border border-orange-200">
                                {OUTPUT_TYPE_LABELS[field.type] || field.type}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeOutputField(index)}
                              className="text-sm opacity-60 hover:opacity-100 ml-2"
                              title="Remove output field"
                            >
                              &times;
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {formData.output_fields.length === 0 && (
                      <p className="mt-2 text-xs text-gray-400 italic">
                        No output fields added yet. Add at least one to define where the enrichment result is stored.
                      </p>
                    )}
                  </div>

                  {/* Execution Order */}
                  <div className="max-w-[200px]">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Execution Order
                    </label>
                    <input
                      type="number"
                      value={formData.execution_order}
                      onChange={(e) =>
                        setFormData({ ...formData, execution_order: parseInt(e.target.value) || 0 })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="px-4 py-2 text-gray-700 hover:text-gray-900"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-primary-400"
                  >
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
