'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchAccountRules,
  toggleRuleEnabled,
  initializeAccountRules,
  createRule,
  updateRule,
  deleteRule,
  syncRulesFromDefault,
  type AccountRule,
  type CreateRuleInput,
  type UpdateRuleInput,
} from '@/lib/accountRules';
import { fetchColumnHeadings, type ColumnHeading } from '@/lib/columnHeadings';

interface RuleFormData {
  ruleId: string;
  name: string;
  description: string;
  ruleType: 'transform' | 'validate';
  targetFields: string[];
  displayOrder: number;
  code: string;
}

const emptyFormData: RuleFormData = {
  ruleId: '',
  name: '',
  description: '',
  ruleType: 'transform',
  targetFields: [],
  displayOrder: 0,
  code: '',
};

const defaultCodeTemplate = `// Transform function receives: value, fieldName, row
// Return the transformed value, or original value if no change needed
// Example:
function transform(value, fieldName, row) {
  if (!value) return value;

  // Your transformation logic here
  return value.trim();
}`;

const defaultValidateTemplate = `// Validate function receives: value, fieldName, row
// Return { valid: true } or { valid: false, message: "Error message" }
// Example:
function validate(value, fieldName, row) {
  if (!value) {
    return { valid: false, message: \`\${fieldName} is required\` };
  }

  // Your validation logic here
  return { valid: true };
}`;

export default function RulesPage() {
  const { user, canEditRules, isLoading: isAuthLoading } = useAuth();
  const [rules, setRules] = useState<AccountRule[]>([]);
  const [columnHeadings, setColumnHeadings] = useState<ColumnHeading[]>([]);
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
  const [customField, setCustomField] = useState('');

  // Prevent double-loading when auth state changes
  const hasLoadedRef = useRef(false);
  const accountId = user?.accountId || 'default';
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Get all unique fields from column headings + rules
  const getAllFields = useCallback(() => {
    const headingNames = columnHeadings.map((h) => h.name);
    const fieldsFromRules = rules.flatMap((r) => r.targetFields);
    const allFields = new Set([...headingNames, ...fieldsFromRules, ...formData.targetFields]);
    return Array.from(allFields).sort();
  }, [columnHeadings, rules, formData.targetFields]);

  // Load rules and column headings from database
  const loadRules = useCallback(async () => {
    setIsLoading(true);

    // Fetch column headings first (for target field options)
    let headings = await fetchColumnHeadings(accountId);
    // Fallback to default account if no headings found
    if (headings.length === 0 && accountId !== 'default') {
      headings = await fetchColumnHeadings('default');
    }
    setColumnHeadings(headings);

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
    // Wait for auth to finish loading before fetching rules
    // This prevents the double-fetch that causes rules to disappear
    if (isAuthLoading) return;
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    loadRules();
  }, [loadRules, isAuthLoading]);

  // Handle Escape key to close modal
  useEffect(() => {
    if (!showModal) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeModal();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showModal]);

  // Fetch source code for a rule
  const fetchSourceCode = async (ruleId: string, rule: AccountRule) => {
    // First check if code is stored in config
    const storedCode = rule.config?.code as string | undefined;
    if (storedCode) {
      setSourceCode((prev) => ({ ...prev, [ruleId]: storedCode }));
      return;
    }

    if (sourceCode[ruleId]) return; // Already loaded

    setLoadingSource(ruleId);
    try {
      const response = await fetch(`/api/rules/source?id=${encodeURIComponent(ruleId)}`);
      if (response.ok) {
        const data = await response.json();
        setSourceCode((prev) => ({ ...prev, [ruleId]: data.source }));
      } else {
        setSourceCode((prev) => ({ ...prev, [ruleId]: '// No code defined for this rule yet' }));
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
      const rule = rules.find((r) => r.ruleId === ruleId);
      if (rule) {
        fetchSourceCode(ruleId, rule);
      }
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

  const handleSyncFromDefault = async () => {
    setIsSyncing(true);
    setSyncMessage(null);

    try {
      const result = await syncRulesFromDefault(accountId);
      if (result.synced > 0) {
        setSyncMessage({ type: 'success', text: `Synced ${result.synced} rule(s) from default` });
        await loadRules(); // Reload to show updated rules
      } else if (result.errors.length > 0) {
        setSyncMessage({ type: 'error', text: result.errors.join(', ') });
      } else {
        setSyncMessage({ type: 'success', text: 'All rules are already up to date' });
      }
    } catch {
      setSyncMessage({ type: 'error', text: 'Failed to sync rules' });
    } finally {
      setIsSyncing(false);
      // Clear message after 5 seconds
      setTimeout(() => setSyncMessage(null), 5000);
    }
  };

  // Count rules missing code
  const rulesWithoutCode = rules.filter((r) => !r.config?.code).length;

  // Modal handlers
  const openAddModal = () => {
    setEditingRule(null);
    setFormData({
      ...emptyFormData,
      displayOrder: rules.length > 0 ? Math.max(...rules.map((r) => r.displayOrder)) + 10 : 10,
      code: defaultCodeTemplate,
    });
    setFormError('');
    setCustomField('');
    setShowModal(true);
  };

  const openEditModal = (rule: AccountRule) => {
    setEditingRule(rule);
    const storedCode = (rule.config?.code as string) || '';
    setFormData({
      ruleId: rule.ruleId,
      name: rule.name,
      description: rule.description || '',
      ruleType: rule.ruleType,
      targetFields: rule.targetFields,
      displayOrder: rule.displayOrder,
      code: storedCode || (rule.ruleType === 'transform' ? defaultCodeTemplate : defaultValidateTemplate),
    });
    setFormError('');
    setCustomField('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingRule(null);
    setFormData(emptyFormData);
    setFormError('');
    setCustomField('');
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
          config: { ...editingRule.config, code: formData.code },
        };

        const success = await updateRule(accountId, editingRule.ruleId, updates);
        if (!success) {
          setFormError('Failed to update rule');
          return;
        }

        // Update source code cache
        setSourceCode((prev) => ({ ...prev, [editingRule.ruleId]: formData.code }));
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
          config: { code: formData.code },
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

  const ALL_FIELDS_VALUE = '*';

  const isAllFieldsSelected = formData.targetFields.includes(ALL_FIELDS_VALUE);

  const toggleAllFields = () => {
    setFormData((prev) => ({
      ...prev,
      targetFields: prev.targetFields.includes(ALL_FIELDS_VALUE)
        ? []
        : [ALL_FIELDS_VALUE],
    }));
  };

  const toggleTargetField = (field: string) => {
    setFormData((prev) => {
      // If "all fields" is selected and user clicks a specific field, deselect "all fields"
      const withoutAll = prev.targetFields.filter((f) => f !== ALL_FIELDS_VALUE);
      return {
        ...prev,
        targetFields: withoutAll.includes(field)
          ? withoutAll.filter((f) => f !== field)
          : [...withoutAll, field],
      };
    });
  };

  const addCustomField = () => {
    const field = customField.trim().toLowerCase().replace(/\s+/g, '_');
    if (field && !formData.targetFields.includes(field)) {
      setFormData((prev) => ({
        ...prev,
        targetFields: [...prev.targetFields, field],
      }));
    }
    setCustomField('');
  };

  const handleRuleTypeChange = (newType: 'transform' | 'validate') => {
    const currentCode = formData.code;
    const isDefaultTransform = currentCode === defaultCodeTemplate || currentCode === '';
    const isDefaultValidate = currentCode === defaultValidateTemplate;

    setFormData((prev) => ({
      ...prev,
      ruleType: newType,
      // Only update code template if it's still the default template
      code: isDefaultTransform || isDefaultValidate
        ? (newType === 'transform' ? defaultCodeTemplate : defaultValidateTemplate)
        : currentCode,
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
              <button
                onClick={handleSyncFromDefault}
                disabled={isSyncing}
                className="px-3 py-1.5 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 disabled:opacity-50"
                title="Copy missing code from default rules"
              >
                {isSyncing ? 'Syncing...' : 'Sync from Default'}
              </button>
            </div>
          )}
        </div>

        <div className="text-sm text-gray-500">
          {enabledCount} of {rules.length} rules enabled
          {rulesWithoutCode > 0 && (
            <span className="ml-2 text-amber-600">
              ({rulesWithoutCode} missing code - click &quot;Sync from Default&quot; to fix)
            </span>
          )}
        </div>

        {syncMessage && (
          <div
            className={`text-sm px-3 py-2 rounded-lg ${
              syncMessage.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {syncMessage.text}
          </div>
        )}

        <div className="space-y-3">
          {isLoading ? (
            <div className="text-center py-12 text-gray-500">
              <div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-2" />
              {isInitializing ? 'Initializing rules for your account...' : 'Loading...'}
            </div>
          ) : (
            rules.map((rule) => {
              const isExpanded = expandedRule === rule.ruleId;
              const source = sourceCode[rule.ruleId] || (rule.config?.code as string);
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
                          {rule.config?.code ? (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">
                              Custom Code
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-700">
                              No Code
                            </span>
                          )}
                        </div>
                        {rule.description && (
                          <p className="text-sm text-gray-500 mt-0.5">{rule.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-400">
                            Target fields: {rule.targetFields.includes('*') ? 'All fields' : rule.targetFields.join(', ')}
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
                          {source || '// No code defined for this rule yet'}
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
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={(e) => {
              // Close when clicking the overlay (not the modal content)
              if (e.target === e.currentTarget) {
                closeModal();
              }
            }}
          >
            <div
              className="bg-white rounded-xl shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={closeModal}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pr-8">
                  {editingRule ? 'Edit Rule' : 'Add Rule'}
                </h3>

                <div className="space-y-4">
                  {formError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                      {formError}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
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
                          placeholder="e.g., region-normalization"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Unique identifier (lowercase, no spaces)
                        </p>
                      </div>
                    )}

                    <div className={editingRule ? 'col-span-2' : ''}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Name
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                        placeholder="e.g., Region Normalization"
                      />
                    </div>
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

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Rule Type
                      </label>
                      <select
                        value={formData.ruleType}
                        onChange={(e) => handleRuleTypeChange(e.target.value as 'transform' | 'validate')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                      >
                        <option value="transform">Transform - Modifies data</option>
                        <option value="validate">Validate - Checks data</option>
                      </select>
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
                      <p className="text-xs text-gray-500 mt-1">Lower numbers run first</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Target Fields
                    </label>
                    <div className="flex flex-wrap gap-2 p-3 border border-gray-300 rounded-lg bg-gray-50">
                      {/* All Fields option - positioned first */}
                      <button
                        type="button"
                        onClick={toggleAllFields}
                        className={`px-2 py-1 text-xs rounded-full transition-colors font-medium ${
                          isAllFieldsSelected
                            ? 'bg-green-600 text-white'
                            : 'bg-white text-green-700 hover:bg-green-100 border border-green-400'
                        }`}
                      >
                        All Fields
                      </button>
                      <span className="text-gray-300">|</span>
                      {getAllFields().map((field) => (
                        <button
                          key={field}
                          type="button"
                          onClick={() => toggleTargetField(field)}
                          disabled={isAllFieldsSelected}
                          className={`px-2 py-1 text-xs rounded-full transition-colors ${
                            isAllFieldsSelected
                              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                              : formData.targetFields.includes(field)
                                ? 'bg-primary-600 text-white'
                                : 'bg-white text-gray-700 hover:bg-gray-200 border border-gray-300'
                          }`}
                        >
                          {field}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <input
                        type="text"
                        value={customField}
                        onChange={(e) => setCustomField(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomField())}
                        className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                        placeholder="Add custom field..."
                      />
                      <button
                        type="button"
                        onClick={addCustomField}
                        className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                      >
                        Add
                      </button>
                    </div>
                    {formData.targetFields.length > 0 && (
                      <p className="text-xs text-gray-500 mt-2">
                        Selected: {isAllFieldsSelected ? 'All fields (applies to every column)' : formData.targetFields.join(', ')}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Rule Code (JavaScript)
                    </label>
                    <textarea
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none font-mono text-sm bg-gray-900 text-green-400"
                      rows={12}
                      spellCheck={false}
                      placeholder="// Enter your rule code here..."
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {formData.ruleType === 'transform'
                        ? 'Transform functions receive (value, fieldName, row) and return the modified value.'
                        : 'Validate functions receive (value, fieldName, row) and return { valid: boolean, message?: string }.'}
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
