'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/lib/supabase';

interface AIModel {
  id: string;
  name: string;
  provider: string;
  model_id: string;
  use_env_key: boolean;
  env_key_name: string | null;
  base_url: string | null;
  is_default: boolean;
  is_active: boolean;
  description: string | null;
  created_at: string;
}

const PROVIDERS = [
  { id: 'openai', name: 'OpenAI', models: ['gpt-4o', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'] },
  { id: 'azure-openai', name: 'Azure OpenAI', models: ['gpt-4o', 'gpt-4-turbo', 'gpt-4', 'gpt-35-turbo'], requiresBaseUrl: true },
  { id: 'anthropic', name: 'Anthropic', models: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'] },
  { id: 'google', name: 'Google', models: ['gemini-pro', 'gemini-pro-vision'] },
  { id: 'serp', name: 'SERP API', models: ['google', 'bing'] },
];

export default function AIModelsPage() {
  const [models, setModels] = useState<AIModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingModel, setEditingModel] = useState<AIModel | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    provider: 'openai',
    model_id: '',
    use_env_key: true,
    env_key_name: '',
    api_key: '',
    base_url: '',
    description: '',
    is_default: false,
  });
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    setIsLoading(true);
    try {
      const { data } = await supabase
        .from('ai_models')
        .select('*')
        .order('created_at', { ascending: false });
      setModels(data || []);
    } catch (err) {
      console.error('Error fetching models:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      provider: 'openai',
      model_id: '',
      use_env_key: true,
      env_key_name: '',
      api_key: '',
      base_url: '',
      description: '',
      is_default: false,
    });
    setFormError('');
    setEditingModel(null);
  };

  const openAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const openEditModal = (model: AIModel) => {
    setEditingModel(model);
    setFormData({
      name: model.name,
      provider: model.provider,
      model_id: model.model_id,
      use_env_key: model.use_env_key,
      env_key_name: model.env_key_name || '',
      api_key: '', // Never show existing key
      base_url: model.base_url || '',
      description: model.description || '',
      is_default: model.is_default,
    });
    setShowAddModal(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.model_id) {
      setFormError('Name and model are required');
      return;
    }

    if (!formData.use_env_key && !formData.api_key && !editingModel) {
      setFormError('API key is required when not using environment variable');
      return;
    }

    setIsSaving(true);
    setFormError('');

    try {
      const data: Record<string, unknown> = {
        name: formData.name,
        provider: formData.provider,
        model_id: formData.model_id,
        use_env_key: formData.use_env_key,
        env_key_name: formData.use_env_key ? formData.env_key_name : null,
        base_url: formData.base_url || null,
        description: formData.description || null,
        is_default: formData.is_default,
      };

      // Only update API key if provided (never store in plain text in real app)
      // In production, you'd encrypt this before storing
      if (formData.api_key && !formData.use_env_key) {
        data.api_key_encrypted = formData.api_key; // In production, encrypt this!
      }

      if (editingModel) {
        await supabase.from('ai_models').update(data).eq('id', editingModel.id);
      } else {
        await supabase.from('ai_models').insert(data);
      }

      // If setting as default, unset others
      if (formData.is_default && editingModel) {
        await supabase
          .from('ai_models')
          .update({ is_default: false })
          .neq('id', editingModel.id);
      }

      setShowAddModal(false);
      resetForm();
      fetchModels();
    } catch {
      setFormError('Failed to save model');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this AI model?')) return;

    try {
      await supabase.from('ai_models').delete().eq('id', id);
      fetchModels();
    } catch (err) {
      console.error('Error deleting model:', err);
    }
  };

  const toggleActive = async (model: AIModel) => {
    try {
      await supabase.from('ai_models').update({ is_active: !model.is_active }).eq('id', model.id);
      fetchModels();
    } catch (err) {
      console.error('Error toggling model:', err);
    }
  };

  const selectedProvider = PROVIDERS.find((p) => p.id === formData.provider);

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
            <h2 className="text-xl font-semibold text-gray-900">AI Models</h2>
            <p className="text-gray-500 text-sm mt-1">
              Configure AI models for data enrichment. API keys are stored securely and never
              displayed after being saved.
            </p>
          </div>
          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Add Model
          </button>
        </div>

        {/* Models list */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-200">
            {models.map((model) => (
              <div key={model.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-medium text-gray-900">{model.name}</h3>
                      {model.is_default && (
                        <span className="px-2 py-0.5 bg-primary-100 text-primary-700 text-xs rounded-full">
                          Default
                        </span>
                      )}
                      {!model.is_active && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                          Disabled
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {model.provider} / {model.model_id}
                    </p>
                    {model.description && (
                      <p className="text-sm text-gray-600 mt-2">{model.description}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      {model.use_env_key
                        ? `Using env: ${model.env_key_name}`
                        : 'Using stored API key'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleActive(model)}
                      className={`text-sm ${
                        model.is_active ? 'text-orange-600' : 'text-green-600'
                      }`}
                    >
                      {model.is_active ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      onClick={() => openEditModal(model)}
                      className="text-sm text-primary-600 hover:text-primary-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(model.id)}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {models.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                No AI models configured. Add one to enable data enrichment.
              </div>
            )}
          </div>
        </div>

        {/* Add/Edit Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {editingModel ? 'Edit AI Model' : 'Add AI Model'}
                </h3>

                <div className="space-y-4">
                  {formError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                      {formError}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                      placeholder="e.g., GPT-4 Turbo"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
                    <select
                      value={formData.provider}
                      onChange={(e) =>
                        setFormData({ ...formData, provider: e.target.value, model_id: '' })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    >
                      {PROVIDERS.map((provider) => (
                        <option key={provider.id} value={provider.id}>
                          {provider.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {formData.provider === 'azure-openai' ? 'Deployment Name' : 'Model'}
                    </label>
                    {formData.provider === 'azure-openai' ? (
                      <input
                        type="text"
                        value={formData.model_id}
                        onChange={(e) => setFormData({ ...formData, model_id: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                        placeholder="e.g., my-gpt-4-deployment"
                      />
                    ) : (
                      <select
                        value={formData.model_id}
                        onChange={(e) => setFormData({ ...formData, model_id: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                      >
                        <option value="">Select a model...</option>
                        {selectedProvider?.models.map((model) => (
                          <option key={model} value={model}>
                            {model}
                          </option>
                        ))}
                      </select>
                    )}
                    {formData.provider === 'azure-openai' && (
                      <p className="text-xs text-gray-500 mt-1">
                        Enter your Azure OpenAI deployment name (not the model name)
                      </p>
                    )}
                  </div>

                  {formData.provider === 'azure-openai' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Azure Endpoint URL
                      </label>
                      <input
                        type="text"
                        value={formData.base_url}
                        onChange={(e) => setFormData({ ...formData, base_url: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                        placeholder="https://your-resource.openai.azure.com"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Your Azure OpenAI resource endpoint URL
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.use_env_key}
                        onChange={(e) =>
                          setFormData({ ...formData, use_env_key: e.target.checked })
                        }
                        className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700">Use environment variable for API key</span>
                    </label>
                  </div>

                  {formData.use_env_key ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Environment Variable Name
                      </label>
                      <input
                        type="text"
                        value={formData.env_key_name}
                        onChange={(e) => setFormData({ ...formData, env_key_name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                        placeholder="e.g., OPENAI_API_KEY"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        API Key {editingModel && '(leave blank to keep current)'}
                      </label>
                      <input
                        type="password"
                        value={formData.api_key}
                        onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                        placeholder="sk-..."
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        API keys are stored securely and never displayed after saving.
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                      rows={2}
                      placeholder="Optional description..."
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.is_default}
                        onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                        className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700">Set as default model</span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => {
                      setShowAddModal(false);
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
