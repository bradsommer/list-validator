'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAppStore } from '@/store/useAppStore';
import { useAuth } from '@/contexts/AuthContext';
import type { FieldMapping, EnrichmentConfig } from '@/types';

export default function SettingsPage() {
  const {
    fieldMappings,
    enrichmentConfigs,
    requiredFields,
    defaultTaskAssignee,
    notifyOnNewCompany,
    addFieldMapping,
    updateFieldMapping,
    removeFieldMapping,
    addEnrichmentConfig,
    updateEnrichmentConfig,
    removeEnrichmentConfig,
    toggleRequiredField,
    setDefaultTaskAssignee,
    setNotifyOnNewCompany,
  } = useAppStore();

  const { user } = useAuth();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');

  const [activeTab, setActiveTab] = useState<'mappings' | 'enrichment' | 'hubspot' | 'billing'>('mappings');
  const [isBillingLoading, setIsBillingLoading] = useState(false);

  useEffect(() => {
    if (tabParam === 'billing') {
      setActiveTab('billing');
    }
  }, [tabParam]);
  const [showAddMapping, setShowAddMapping] = useState(false);
  const [showAddEnrichment, setShowAddEnrichment] = useState(false);

  const [newMapping, setNewMapping] = useState({
    hubspotField: '',
    hubspotLabel: '',
    variants: '',
  });

  const [newEnrichment, setNewEnrichment] = useState({
    name: '',
    description: '',
    prompt: '',
    inputFields: '',
    outputField: '',
    service: 'serp' as const,
  });

  const handleAddMapping = () => {
    if (!newMapping.hubspotField || !newMapping.hubspotLabel) return;

    addFieldMapping({
      id: `custom_${Date.now()}`,
      hubspotField: newMapping.hubspotField.toLowerCase().replace(/\s+/g, '_'),
      hubspotLabel: newMapping.hubspotLabel,
      variants: newMapping.variants.split(',').map((v) => v.trim().toLowerCase()).filter((v) => v),
      isRequired: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    setNewMapping({ hubspotField: '', hubspotLabel: '', variants: '' });
    setShowAddMapping(false);
  };

  const handleAddEnrichment = () => {
    if (!newEnrichment.name || !newEnrichment.outputField) return;

    addEnrichmentConfig({
      id: `enrich_${Date.now()}`,
      name: newEnrichment.name,
      description: newEnrichment.description,
      prompt: newEnrichment.prompt,
      inputFields: newEnrichment.inputFields.split(',').map((f) => f.trim()).filter((f) => f),
      outputField: newEnrichment.outputField,
      service: newEnrichment.service,
      isEnabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    setNewEnrichment({
      name: '',
      description: '',
      prompt: '',
      inputFields: '',
      outputField: '',
      service: 'serp',
    });
    setShowAddEnrichment(false);
  };

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-hubspot-orange rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Settings</h1>
                <p className="text-sm text-gray-500">Configure field mappings, enrichment, and HubSpot</p>
              </div>
            </div>
            <Link
              href="/"
              className="px-4 py-2 text-primary-600 hover:text-primary-700 font-medium"
            >
              Back to Validator
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('mappings')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'mappings'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            Field Mappings
          </button>
          <button
            onClick={() => setActiveTab('enrichment')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'enrichment'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            Data Enrichment
          </button>
          <button
            onClick={() => setActiveTab('hubspot')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'hubspot'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            HubSpot Settings
          </button>
          <button
            onClick={() => setActiveTab('billing')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'billing'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            Billing
          </button>
        </div>

        {/* Field Mappings Tab */}
        {activeTab === 'mappings' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold">Field Mappings</h2>
              <button
                onClick={() => setShowAddMapping(true)}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                + Add Mapping
              </button>
            </div>

            {/* Required fields */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Required Fields</h3>
              <div className="flex flex-wrap gap-2">
                {fieldMappings.map((field) => (
                  <button
                    key={field.id}
                    onClick={() => toggleRequiredField(field.hubspotField)}
                    className={`px-3 py-1 text-sm rounded-full transition-colors ${
                      requiredFields.includes(field.hubspotField)
                        ? 'bg-red-100 text-red-700 border border-red-300'
                        : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                    }`}
                  >
                    {field.hubspotLabel}
                    {requiredFields.includes(field.hubspotField) && ' *'}
                  </button>
                ))}
              </div>
            </div>

            {/* Mappings list */}
            <div className="space-y-3">
              {fieldMappings.map((mapping) => (
                <div
                  key={mapping.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                >
                  <div>
                    <div className="font-medium">{mapping.hubspotLabel}</div>
                    <div className="text-sm text-gray-500">
                      Field: {mapping.hubspotField} | Variants: {mapping.variants.join(', ')}
                    </div>
                  </div>
                  <button
                    onClick={() => removeFieldMapping(mapping.id)}
                    className="text-red-500 hover:text-red-700 p-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            {/* Add mapping modal */}
            {showAddMapping && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 w-full max-w-md">
                  <h3 className="text-lg font-semibold mb-4">Add Field Mapping</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        HubSpot Field Name
                      </label>
                      <input
                        type="text"
                        value={newMapping.hubspotField}
                        onChange={(e) => setNewMapping({ ...newMapping, hubspotField: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Display Label
                      </label>
                      <input
                        type="text"
                        value={newMapping.hubspotLabel}
                        onChange={(e) => setNewMapping({ ...newMapping, hubspotLabel: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Variants (comma-separated)
                      </label>
                      <input
                        type="text"
                        value={newMapping.variants}
                        onChange={(e) => setNewMapping({ ...newMapping, variants: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 mt-6">
                    <button
                      onClick={() => setShowAddMapping(false)}
                      className="px-4 py-2 text-gray-600"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddMapping}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Enrichment Tab */}
        {activeTab === 'enrichment' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold">Enrichment Configurations</h2>
              <button
                onClick={() => setShowAddEnrichment(true)}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                + Add Configuration
              </button>
            </div>

            <div className="space-y-4">
              {enrichmentConfigs.map((config) => (
                <div
                  key={config.id}
                  className={`p-4 border rounded-lg ${
                    config.isEnabled ? 'border-primary-200 bg-primary-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={config.isEnabled}
                            onChange={(e) =>
                              updateEnrichmentConfig(config.id, { isEnabled: e.target.checked })
                            }
                            className="w-4 h-4 text-primary-600 rounded"
                          />
                          <span className="font-medium">{config.name}</span>
                        </label>
                        <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs rounded">
                          {config.service.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{config.description}</p>
                      <div className="mt-2 text-xs text-gray-500">
                        Input: {config.inputFields.join(', ')} → Output: {config.outputField}
                      </div>
                    </div>
                    <button
                      onClick={() => removeEnrichmentConfig(config.id)}
                      className="text-red-500 hover:text-red-700 p-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add enrichment modal */}
            {showAddEnrichment && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 w-full max-w-lg">
                  <h3 className="text-lg font-semibold mb-4">Add Enrichment Configuration</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                      <input
                        type="text"
                        value={newEnrichment.name}
                        onChange={(e) => setNewEnrichment({ ...newEnrichment, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <input
                        type="text"
                        value={newEnrichment.description}
                        onChange={(e) =>
                          setNewEnrichment({ ...newEnrichment, description: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Prompt</label>
                      <textarea
                        value={newEnrichment.prompt}
                        onChange={(e) => setNewEnrichment({ ...newEnrichment, prompt: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg h-24"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Input Fields (comma-separated)
                      </label>
                      <input
                        type="text"
                        value={newEnrichment.inputFields}
                        onChange={(e) =>
                          setNewEnrichment({ ...newEnrichment, inputFields: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Output Field</label>
                      <input
                        type="text"
                        value={newEnrichment.outputField}
                        onChange={(e) =>
                          setNewEnrichment({ ...newEnrichment, outputField: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Service</label>
                      <select
                        value={newEnrichment.service}
                        onChange={(e) =>
                          setNewEnrichment({ ...newEnrichment, service: e.target.value as 'serp' })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="serp">SERP API</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 mt-6">
                    <button
                      onClick={() => setShowAddEnrichment(false)}
                      className="px-4 py-2 text-gray-600"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddEnrichment}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* HubSpot Tab */}
        {activeTab === 'hubspot' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-6">HubSpot Configuration</h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Task Assignee ID
                </label>
                <input
                  type="text"
                  value={defaultTaskAssignee}
                  onChange={(e) => setDefaultTaskAssignee(e.target.value)}
                  placeholder="Enter HubSpot Owner ID"
                  className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Tasks for new companies will be assigned to this owner.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notify on New Company (User IDs, comma-separated)
                </label>
                <input
                  type="text"
                  value={notifyOnNewCompany.join(', ')}
                  onChange={(e) =>
                    setNotifyOnNewCompany(
                      e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter((s) => s)
                    )
                  }
                  placeholder="Enter HubSpot Owner IDs"
                  className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg"
                />
                <p className="text-sm text-gray-500 mt-1">
                  These users will be notified when new companies are created.
                </p>
              </div>

              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h3 className="font-medium text-yellow-800 mb-2">API Configuration</h3>
                <p className="text-sm text-yellow-700">
                  HubSpot API credentials should be configured in environment variables:
                </p>
                <ul className="list-disc list-inside text-sm text-yellow-700 mt-2 space-y-1">
                  <li>HUBSPOT_ACCESS_TOKEN - Your HubSpot private app access token</li>
                  <li>HUBSPOT_PORTAL_ID - Your HubSpot portal ID</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Billing Tab */}
        {activeTab === 'billing' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-6">Subscription & Billing</h2>

            <div className="space-y-6">
              {/* Current Plan */}
              <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">Current Plan</h3>
                    <p className="text-2xl font-bold text-gray-900 mt-1">Pro Plan</p>
                    <p className="text-gray-600">$19.99/month</p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        user?.subscriptionStatus === 'active' || user?.subscriptionStatus === 'trialing'
                          ? 'bg-green-100 text-green-800'
                          : user?.subscriptionStatus === 'past_due'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {user?.subscriptionStatus === 'trialing'
                        ? 'Trial'
                        : user?.subscriptionStatus === 'active'
                        ? 'Active'
                        : user?.subscriptionStatus === 'past_due'
                        ? 'Past Due'
                        : user?.subscriptionStatus || 'Active'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Plan Features */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Plan Features</h3>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-gray-600">
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Unlimited imports
                  </li>
                  <li className="flex items-center gap-2 text-gray-600">
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    All validation rules
                  </li>
                  <li className="flex items-center gap-2 text-gray-600">
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Custom import questions
                  </li>
                  <li className="flex items-center gap-2 text-gray-600">
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Column mapping with memory
                  </li>
                  <li className="flex items-center gap-2 text-gray-600">
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    CSV & Excel export
                  </li>
                </ul>
              </div>

              {/* Manage Subscription Button */}
              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600 mb-4">
                  Update your payment method, view billing history, or cancel your subscription.
                </p>
                {user?.stripeCustomerId ? (
                  <button
                    onClick={async () => {
                      setIsBillingLoading(true);
                      try {
                        const response = await fetch('/api/stripe/portal', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ customerId: user.stripeCustomerId }),
                        });
                        const data = await response.json();
                        if (data.url) {
                          window.location.href = data.url;
                        }
                      } catch (error) {
                        console.error('Error opening billing portal:', error);
                      }
                      setIsBillingLoading(false);
                    }}
                    disabled={isBillingLoading}
                    className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 font-medium"
                  >
                    {isBillingLoading ? 'Loading...' : 'Manage Subscription'}
                  </button>
                ) : (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-700">
                      Billing management is not available yet. Your subscription may still be processing.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
