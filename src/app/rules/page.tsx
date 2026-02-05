'use client';

import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchAccountRules,
  toggleRuleEnabled,
  initializeAccountRules,
  createRule,
  updateRule,
  deleteRule,
  type AccountRule,
  type CreateRuleInput,
  type UpdateRuleInput,
} from '@/lib/accountRules';

// Available HubSpot fields for targeting
const AVAILABLE_FIELDS = [
  'email',
  'firstname',
  'lastname',
  'phone',
  'company',
  'jobtitle',
  'city',
  'state',
  'country',
  'zip',
  'website',
  'address',
];

interface RuleFormData {
  ruleId: string;
  name: string;
  description: string;
  ruleType: 'transform' | 'validate';
  targetFields: string[];
  displayOrder: number;
}

const emptyFormData: RuleFormData = {
  ruleId: '',
  name: '',
  description: '',
  ruleType: 'transform',
  targetFields: [],
  displayOrder: 0,
};

export default function RulesPage() {
  const { user, canEditRules } = useAuth();
  const [rules, setRules] = useState<AccountRule[]>([]);
  const [expandedRule, setExpandedRule] = useState<string | null>(null);
  const [sourceCode, setSourceCode] = useState<Record<string, string>>({});
  const [loadingSource, setLoadingSource] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(false);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState<AccountRule | null>(null);
  const [formData, setFormData] = useState<RuleFormData>(emptyFormData);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const accountId = user?.accountId || 'default';

  // Load rules from database, auto-initialize if empty
  const loadRules = useCallback(async () => {
    setIsLoading(true);
    let accountRules = await fetchAccountRules(accountId);

    // If no rules for this account, try to initialize from 'default'
    if (accountRules.length === 0 && accountId !== 'default') {
      setIsInitializing(true);
      const initialized = await initializeAccountRules(accountId, 'default');
      if (initialized) {
        accountRules = await fetchAccountRules(accountId);
      }
      setIsInitializing(false);
    }

    // If still no rules (e.g., 'default' has no rules either), try fetching from 'default' directly
    if (accountRules.length === 0) {
      accountRules = await fetchAccountRules('default');
    }

    setRules(accountRules);
    setIsLoading(false);
  }, [accountId]);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  // Fetch source code for a rule
  const fetchSourceCode = async (ruleId: string) => {
    if (sourceCode[ruleId]) return; // Already loaded

    setLoadingSource(ruleId);
    try {
      const response = await fetch(`/api/rules/source?id=${encodeURIComponent(ruleId)}`);
      if (response.ok) {
        const data = await response.json();
        setSourceCode((prev) => ({ ...prev, [ruleId]: data.source }));
      } else {
        setSourceCode((prev) => ({ ...prev, [ruleId]: '// Source code not available' }));
      }
    } catch {
      setSourceCode((prev) => ({ ...prev, [ruleId]: '// Failed to load source code' }));
    }
    setLoadingSource(null);
  };

  const handleToggleRule = async (ruleId: string, currentEnabled: boolean) => {
    // Optimistic update
    setRules((prev) =>
      prev.map((r) => (r.ruleId === ruleId ? { ...r, enabled: !currentEnabled } : r))
    );

    const success = await toggleRuleEnabled(accountId, ruleId, !currentEnabled);
    if (!success) {
      // Revert on failure
      setRules((prev) =>
        prev.map((r) => (r.ruleId === ruleId ? { ...r, enabled: currentEnabled } : r))
      );
    }
  };

  const handleExpandRule = (ruleId: string) => {
    if (expandedRule === ruleId) {
      setExpandedRule(null);
    } else {
      setExpandedRule(ruleId);
      fetchSourceCode(ruleId);
    }
  };

  const enableAll = async () => {
    const updates = rules.filter((r) => !r.enabled).map((r) => r.ruleId);
    setRules((prev) => prev.map((r) => ({ ...r, enabled: true })));

    for (const ruleId of updates) {
      await toggleRuleEnabled(accountId, ruleId, true);
    }
  };

  const disableAll = async () => {
    const updates = rules.filter((r) => r.enabled).map((r) => r.ruleId);
    setRules((prev) => prev.map((r) => ({ ...r, enabled: false })));

    for (const ruleId of updates) {
      await toggleRuleEnabled(accountId, ruleId, false);
    }
  };

  // Modal handlers
  const openAddModal = () => {
    setEditingRule(null);
    setFormData({
      ...emptyFormData,
      displayOrder: rules.length > 0 ? Math.max(...rules.map((r) => r.displayOrder)) + 10 : 10,
    });
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (rule: AccountRule) => {
    setEditingRule(rule);
    setFormData({
      ruleId: rule.ruleId,
      name: rule.name,
      description: rule.description || '',
      ruleType: rule.ruleType,
      targetFields: rule.targetFields,
      displayOrder: rule.displayOrder,
    });
    setFormError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingRule(null);
    setFormData(emptyFormData);
    setFormError('');
  };

  const handleSave = async () => {
    // Validation
    if (!formData.name.trim()) {
      setFormError('Name is required');
      return;
    }
    if (!editingRule && !formData.ruleId.trim()) {
      setFormError('Rule ID is required');
      return;
    }
    if (formData.targetFields.length === 0) {
      setFormError('At least one target field is required');
      return;
    }

    // Check for duplicate rule ID when creating
    if (!editingRule && rules.some((r) => r.ruleId === formData.ruleId.trim())) {
      setFormError('A rule with this ID already exists');
      return;
    }

    setIsSaving(true);
    setFormError('');

    try {
      if (editingRule) {
        // Update existing rule
        const updates: UpdateRuleInput = {
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          ruleType: formData.ruleType,
          targetFields: formData.targetFields,
          displayOrder: formData.displayOrder,
        };

        const success = await updateRule(accountId, editingRule.ruleId, updates);
        if (!success) {
          setFormError('Failed to update rule');
          return;
        }
      } else {
        // Create new rule
        const input: CreateRuleInput = {
          accountId,
          ruleId: formData.ruleId.trim().toLowerCase().replace(/\s+/g, '-'),
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          ruleType: formData.ruleType,
          targetFields: formData.targetFields,
          displayOrder: formData.displayOrder,
          enabled: true,
        };

        const newRule = await createRule(input);
        if (!newRule) {
          setFormError('Failed to create rule');
          return;
        }
      }

      closeModal();
      loadRules();
    } catch {
      setFormError('An error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (rule: AccountRule) => {
    if (!confirm(`Are you sure you want to delete the rule "${rule.name}"?`)) {
      return;
    }

    const success = await deleteRule(accountId, rule.ruleId);
    if (success) {
      loadRules();
    } else {
      alert('Failed to delete rule');
    }
  };

  const toggleTargetField = (field: string) => {
    setFormData((prev) => ({
      ...prev,
      targetFields: prev.targetFields.includes(field)
        ? prev.targetFields.filter((f) => f !== field)
        : [...prev.targetFields, field],
    }));
  };

  const enabledCount = rules.filter((r) => r.enabled).length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-600">
              Validation rules that clean and format your uploaded data.
              {canEditRules
                ? ' Toggle rules on or off to control which validations run during import.'
                : ' Contact an admin to enable or disable rules.'}
            </p>
          </div>
          {canEditRules && (
            <div className="flex gap-2">
              <button
                onClick={openAddModal}
                className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Add Rule
              </button>
              <button
                onClick={enableAll}
                className="px-3 py-1.5 text-sm bg-green-50 text-green-700 rounded-lg hover:bg-green-100"
              >
                Enable All
              </button>
              <button
                onClick={disableAll}
                className="px-3 py-1.5 text-sm bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100"
              >
                Disable All
              </button>
            </div>
          )}
        </div>

        <div className="text-sm text-gray-500">
          {enabledCount} of {rules.length} rules enabled
        </div>

        <div className="space-y-3">
          {isLoading ? (
            <div className="text-center py-12 text-gray-500">
              <div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-2" />
              {isInitializing ? 'Initializing rules for your account...' : 'Loading...'}
            </div>
          ) : (
            rules.map((rule) => {
              const isExpanded = expandedRule === rule.ruleId;
              const source = sourceCode[rule.ruleId];
              const isLoadingThisSource = loadingSource === rule.ruleId;

              return (
                <div
                  key={rule.id}
                  className={`border rounded-lg overflow-hidden ${
                    rule.enabled ? 'border-green-200 bg-white' : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3 flex-1">
                      {/* Toggle */}
                      <button
                        onClick={() => canEditRules && handleToggleRule(rule.ruleId, rule.enabled)}
                        disabled={!canEditRules}
                        className={`relative w-10 h-5 rounded-full transition-colors ${
                          rule.enabled ? 'bg-green-500' : 'bg-gray-300'
                        } ${!canEditRules ? 'opacity-60 cursor-not-allowed' : ''}`}
                        title={!canEditRules ? 'You do not have permission to modify rules' : ''}
                      >
                        <span
                          className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                            rule.enabled ? 'left-5' : 'left-0.5'
                          }`}
                        />
                      </button>

                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{rule.name}</span>
                          <span
                            className={`px-2 py-0.5 text-xs rounded-full ${
                              rule.ruleType === 'transform'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-purple-100 text-purple-700'
                            }`}
                          >
                            {rule.ruleType === 'transform' ? 'Transform' : 'Validate'}
                          </span>
                        </div>
                        {rule.description && (
                          <p className="text-sm text-gray-500 mt-0.5">{rule.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-400">
                            Target fields: {rule.targetFields.join(', ')}
                          </span>
                          <span className="text-xs text-gray-400">
                            Order: {rule.displayOrder}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {canEditRules && (
                        <>
                          <button
                            onClick={() => openEditModal(rule)}
                            className="px-3 py-1.5 text-sm text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(rule)}
                            className="px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
                          >
                            Delete
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleExpandRule(rule.ruleId)}
                        className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                      >
                        {isExpanded ? 'Hide Code' : 'View Code'}
                      </button>
                    </div>
                  </div>

                  {/* Code view */}
                  {isExpanded && (
                    <div className="border-t border-gray-200 bg-gray-900 p-4 overflow-x-auto max-h-[500px] overflow-y-auto">
                      {isLoadingThisSource ? (
                        <div className="text-gray-400 text-sm">Loading source code...</div>
                      ) : (
                        <pre className="text-sm text-green-400 font-mono whitespace-pre">
                          {source || '// Loading...'}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {!isLoading && rules.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-gray-600 font-medium">No validation rules found</p>
            <p className="text-sm text-gray-500 mt-1 mb-4">
              {canEditRules ? 'Click "Add Rule" to create your first validation rule.' : 'Contact an admin to add rules.'}
            </p>
            {canEditRules && (
              <button
                onClick={openAddModal}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Add Rule
              </button>
            )}
          </div>
        )}

        {/* Add/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {editingRule ? 'Edit Rule' : 'Add Rule'}
                </h3>

                <div className="space-y-4">
                  {formError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                      {formError}
                    </div>
                  )}

                  {!editingRule && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Rule ID
                      </label>
                      <input
                        type="text"
                        value={formData.ruleId}
                        onChange={(e) => setFormData({ ...formData, ruleId: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                        placeholder="e.g., custom-phone-format"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        A unique identifier for this rule (lowercase, no spaces)
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                      placeholder="e.g., Custom Phone Format"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                      rows={2}
                      placeholder="What does this rule do?"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Rule Type
                    </label>
                    <select
                      value={formData.ruleType}
                      onChange={(e) =>
                        setFormData({ ...formData, ruleType: e.target.value as 'transform' | 'validate' })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    >
                      <option value="transform">Transform - Modifies data</option>
                      <option value="validate">Validate - Checks data and reports issues</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Target Fields
                    </label>
                    <div className="flex flex-wrap gap-2 p-3 border border-gray-300 rounded-lg">
                      {AVAILABLE_FIELDS.map((field) => (
                        <button
                          key={field}
                          type="button"
                          onClick={() => toggleTargetField(field)}
                          className={`px-2 py-1 text-xs rounded-full transition-colors ${
                            formData.targetFields.includes(field)
                              ? 'bg-primary-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {field}
                        </button>
                      ))}
                    </div>
                    {formData.targetFields.length > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        Selected: {formData.targetFields.join(', ')}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Execution Order
                    </label>
                    <input
                      type="number"
                      value={formData.displayOrder}
                      onChange={(e) =>
                        setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Lower numbers run first
                    </p>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={closeModal}
                    className="px-4 py-2 text-gray-700 hover:text-gray-900"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-primary-400"
                  >
                    {isSaving ? 'Saving...' : editingRule ? 'Save Changes' : 'Add Rule'}
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
