'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/lib/supabase';

interface AIModel {
  id: string;
  name: string;
  provider: string;
  model_id: string;
  is_active: boolean;
}

interface HubSpotField {
  id: string;
  field_name: string;
  field_label: string;
}

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

export default function EnrichmentPage() {
  const [configs, setConfigs] = useState<EnrichmentConfig[]>([]);
  const [aiModels, setAiModels] = useState<AIModel[]>([]);
  const [hubspotFields, setHubspotFields] = useState<HubSpotField[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState<EnrichmentConfig | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    ai_model_id: '',
    prompt_template: '',
    input_fields: [] as string[],
    output_field: '',
    execution_order: 0,
  });
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [configsRes, modelsRes, fieldsRes] = await Promise.all([
        supabase.from('enrichment_configs').select('*, ai_model:ai_models(*)').order('execution_order'),
        supabase.from('ai_models').select('*').eq('is_active', true),
        supabase.from('hubspot_fields').select('*').order('field_label'),
      ]);

      setConfigs(configsRes.data || []);
      setAiModels(modelsRes.data || []);
      setHubspotFields(fieldsRes.data || []);
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
      output_field: '',
      execution_order: configs.length * 10 + 10,
    });
    setFormError('');
    setEditingConfig(null);
  };

  const openAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (config: EnrichmentConfig) => {
    setEditingConfig(config);
    setFormData({
      name: config.name,
      description: config.description || '',
      ai_model_id: config.ai_model_id || '',
      prompt_template: config.prompt_template,
      input_fields: config.input_fields,
      output_field: config.output_field,
      execution_order: config.execution_order,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.prompt_template || !formData.output_field) {
      setFormError('Name, prompt template, and output field are required');
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
        input_fields: formData.input_fields,
        output_field: formData.output_field,
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

  const toggleInputField = (fieldName: string) => {
    setFormData((prev) => ({
      ...prev,
      input_fields: prev.input_fields.includes(fieldName)
        ? prev.input_fields.filter((f) => f !== fieldName)
        : [...prev.input_fields, fieldName],
    }));
  };

  const insertFieldPlaceholder = (fieldName: string) => {
    const placeholder = `{{${fieldName}}}`;
    setFormData((prev) => ({
      ...prev,
      prompt_template: prev.prompt_template + placeholder,
    }));
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
              Configure data enrichment actions with AI models. Use {'{{field_name}}'} placeholders
              in prompts to insert field values.
            </p>
          </div>
          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Add Enrichment
          </button>
        </div>

        {/* Configs list */}
        <div className="space-y-4">
          {configs.map((config) => (
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
                      <span>Output: {config.output_field}</span>
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
                    {config.prompt_template}
                  </code>
                </div>

                {/* Input fields */}
                {config.input_fields.length > 0 && (
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-xs text-gray-500">Uses fields:</span>
                    {config.input_fields.map((field) => (
                      <span
                        key={field}
                        className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded"
                      >
                        {field}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

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

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Input Fields (click to use in prompt)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {hubspotFields.map((field) => (
                        <button
                          key={field.id}
                          type="button"
                          onClick={() => {
                            toggleInputField(field.field_name);
                            insertFieldPlaceholder(field.field_name);
                          }}
                          className={`px-2 py-1 text-sm rounded border transition-colors ${
                            formData.input_fields.includes(field.field_name)
                              ? 'bg-primary-100 border-primary-300 text-primary-700'
                              : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          {field.field_label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Prompt Template
                    </label>
                    <textarea
                      value={formData.prompt_template}
                      onChange={(e) =>
                        setFormData({ ...formData, prompt_template: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none font-mono text-sm"
                      rows={4}
                      placeholder="Enter your prompt template. Use {{field_name}} to insert field values."
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Available placeholders: {formData.input_fields.map((f) => `{{${f}}}`).join(', ') || 'Select fields above'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Output Field
                      </label>
                      <input
                        type="text"
                        value={formData.output_field}
                        onChange={(e) => setFormData({ ...formData, output_field: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                        placeholder="e.g., official_company_name"
                      />
                    </div>

                    <div>
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
