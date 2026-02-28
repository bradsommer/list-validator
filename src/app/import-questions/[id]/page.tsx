'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import type { ImportQuestion, QuestionType } from '@/lib/importQuestions';

export default function EditImportQuestionPage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const questionId = params.id as string;
  const isNew = questionId === 'new';

  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    questionText: '',
    columnHeader: '',
    questionType: 'dropdown' as QuestionType,
    options: [''],
    optionValues: {} as Record<string, string>,
    isRequired: false,
    displayOrder: 100,
    enabled: true,
  });

  const [isBulkEditing, setIsBulkEditing] = useState(false);
  const [bulkText, setBulkText] = useState('');

  const accountId = user?.accountId || 'default';

  // Helper to check if question type needs options
  const needsOptions = (type: QuestionType): boolean => {
    return type === 'dropdown' || type === 'radio' || type === 'multiselect';
  };

  // Load existing question data when editing
  const loadQuestion = useCallback(async () => {
    if (isNew) return;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/import-questions?accountId=${encodeURIComponent(accountId)}`);
      const data = await response.json();
      if (data.success) {
        const question = data.questions.find((q: ImportQuestion) => q.id === questionId);
        if (question) {
          setFormData({
            questionText: question.questionText,
            columnHeader: question.columnHeader,
            questionType: question.questionType,
            options: question.options.length > 0 ? question.options : [''],
            optionValues: question.optionValues || {},
            isRequired: question.isRequired,
            displayOrder: question.displayOrder,
            enabled: question.enabled,
          });
        } else {
          router.push('/import-questions');
        }
      }
    } catch (error) {
      console.error('Failed to load question:', error);
    }
    setIsLoading(false);
  }, [accountId, questionId, isNew, router]);

  useEffect(() => {
    loadQuestion();
  }, [loadQuestion]);

  const handleSave = async () => {
    if (!formData.questionText || !formData.columnHeader) {
      alert('Please fill in the question text and column header');
      return;
    }

    const cleanOptions = formData.options.filter((opt) => opt.trim() !== '');
    if (needsOptions(formData.questionType) && cleanOptions.length === 0) {
      alert('Please add at least one option');
      return;
    }

    setIsSaving(true);

    try {
      const cleanOptionValues: Record<string, string> = {};
      for (const opt of cleanOptions) {
        if (formData.optionValues[opt] && formData.optionValues[opt].trim()) {
          cleanOptionValues[opt] = formData.optionValues[opt].trim();
        }
      }

      if (isNew) {
        const response = await fetch('/api/import-questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accountId,
            questionText: formData.questionText,
            columnHeader: formData.columnHeader,
            questionType: formData.questionType,
            options: cleanOptions,
            optionValues: cleanOptionValues,
            isRequired: formData.isRequired,
            displayOrder: formData.displayOrder,
            enabled: formData.enabled,
          }),
        });

        if (response.ok) {
          router.push('/import-questions');
        }
      } else {
        const response = await fetch('/api/import-questions', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: questionId,
            questionText: formData.questionText,
            columnHeader: formData.columnHeader,
            questionType: formData.questionType,
            options: cleanOptions,
            optionValues: cleanOptionValues,
            isRequired: formData.isRequired,
            displayOrder: formData.displayOrder,
            enabled: formData.enabled,
          }),
        });

        if (response.ok) {
          router.push('/import-questions');
        }
      }
    } catch (error) {
      console.error('Failed to save question:', error);
    }

    setIsSaving(false);
  };

  const addOption = () => {
    setFormData((prev) => ({ ...prev, options: [...prev.options, ''] }));
  };

  const removeOption = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index),
    }));
  };

  const moveOption = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= formData.options.length) return;
    setFormData((prev) => {
      const newOptions = [...prev.options];
      [newOptions[index], newOptions[newIndex]] = [newOptions[newIndex], newOptions[index]];
      return { ...prev, options: newOptions };
    });
  };

  const sortOptionsAlphabetically = () => {
    setFormData((prev) => ({
      ...prev,
      options: [...prev.options].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })),
    }));
  };

  const startBulkEdit = () => {
    setBulkText(formData.options.filter((o) => o.trim()).join('\n'));
    setIsBulkEditing(true);
  };

  const applyBulkEdit = () => {
    const lines = bulkText.split('\n').filter((line) => line.trim() !== '').map((line) => line.trim());
    if (lines.length === 0) return;
    setFormData((prev) => {
      const newOptionValues: Record<string, string> = {};
      for (const line of lines) {
        if (prev.optionValues[line]) {
          newOptionValues[line] = prev.optionValues[line];
        }
      }
      return { ...prev, options: lines, optionValues: newOptionValues };
    });
    setIsBulkEditing(false);
    setBulkText('');
  };

  const updateOption = (index: number, value: string) => {
    const oldOption = formData.options[index];
    setFormData((prev) => {
      const newOptionValues = { ...prev.optionValues };
      if (oldOption && oldOption !== value && newOptionValues[oldOption] !== undefined) {
        newOptionValues[value] = newOptionValues[oldOption];
        delete newOptionValues[oldOption];
      }
      return {
        ...prev,
        options: prev.options.map((opt, i) => (i === index ? value : opt)),
        optionValues: newOptionValues,
      };
    });
  };

  const updateOptionValue = (optionLabel: string, outputValue: string) => {
    setFormData((prev) => {
      const newOptionValues = { ...prev.optionValues };
      if (outputValue === optionLabel) {
        delete newOptionValues[optionLabel];
      } else {
        newOptionValues[optionLabel] = outputValue;
      }
      return { ...prev, optionValues: newOptionValues };
    });
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="text-center py-12 text-gray-500">
          <div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-2" />
          Loading...
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/import-questions')}
            className="flex items-center gap-1 px-2 py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm">Back</span>
          </button>
          <h2 className="text-lg font-semibold text-gray-900">
            {isNew ? 'New Question' : 'Edit Question'}
          </h2>
        </div>

        {/* Form */}
        <div className="border rounded-lg bg-white p-6 space-y-4">
          {/* Question Text */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Question Text *
            </label>
            <input
              type="text"
              value={formData.questionText}
              onChange={(e) => setFormData((prev) => ({ ...prev, questionText: e.target.value }))}
              placeholder="e.g., Is this a B2B or B2C list?"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          {/* Column Header */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Column Header *
            </label>
            <input
              type="text"
              value={formData.columnHeader}
              onChange={(e) => setFormData((prev) => ({ ...prev, columnHeader: e.target.value }))}
              placeholder="e.g., B2B or B2C"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              This will be the name of the new column added to the imported data.
            </p>
          </div>

          {/* Question Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Answer Type
            </label>
            <select
              value={formData.questionType}
              onChange={(e) => {
                const newType = e.target.value as QuestionType;
                setFormData((prev) => ({
                  ...prev,
                  questionType: newType,
                  options: newType === 'checkbox' ? ['Yes', 'No'] : newType === 'text' ? [] : prev.options.length > 0 ? prev.options : [''],
                }));
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="text">Free Text</option>
              <option value="dropdown">Dropdown (Single Select)</option>
              <option value="checkbox">Checkbox (Yes/No)</option>
              <option value="radio">Radio Select (Single Choice)</option>
              <option value="multiselect">Multiple Select (Checkboxes)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {formData.questionType === 'text' && 'User enters any text value.'}
              {formData.questionType === 'dropdown' && 'User picks one option from a dropdown menu.'}
              {formData.questionType === 'checkbox' && 'User checks a box for Yes or leaves unchecked for No.'}
              {formData.questionType === 'radio' && 'User selects one option from radio buttons.'}
              {formData.questionType === 'multiselect' && 'User can select multiple options via checkboxes.'}
            </p>
          </div>

          {/* Options (for dropdown, radio, multiselect) */}
          {needsOptions(formData.questionType) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Options &amp; Output Values
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Configure what users see vs what gets written to the spreadsheet.
              </p>
              {isBulkEditing ? (
                <div className="space-y-3">
                  <p className="text-xs text-gray-500">
                    Paste or type options below, one per line. Empty lines will be removed.
                  </p>
                  <textarea
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    placeholder="Paste options here, one per line..."
                    rows={10}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-sm"
                    autoFocus
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={applyBulkEdit}
                      disabled={!bulkText.trim()}
                      className="px-3 py-1.5 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 disabled:opacity-50"
                    >
                      Apply
                    </button>
                    <button
                      type="button"
                      onClick={() => { setIsBulkEditing(false); setBulkText(''); }}
                      className="px-3 py-1.5 text-gray-600 hover:text-gray-800 text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Header row - hidden on mobile since layout stacks */}
                  <div className="hidden md:flex items-center gap-2 text-xs text-gray-500 font-medium">
                    <div className="flex-1">Option (what user sees)</div>
                    <div className="w-8"></div>
                    <div className="flex-1">Output Value</div>
                    <div className="w-[100px]"></div>
                  </div>
                  {formData.options.map((option, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-3 md:border-0 md:p-0">
                      <div className="flex flex-col md:flex-row md:items-center gap-2">
                        {/* Mobile reorder buttons */}
                        <div className="flex md:hidden items-center gap-1">
                          <button
                            type="button"
                            onClick={() => moveOption(index, 'up')}
                            disabled={index === 0}
                            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-25"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => moveOption(index, 'down')}
                            disabled={index === formData.options.length - 1}
                            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-25"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          <span className="text-xs text-gray-400 ml-1">Reorder</span>
                        </div>
                        <div className="md:hidden text-xs text-gray-500 font-medium">Option (what user sees)</div>
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => updateOption(index, e.target.value)}
                          placeholder={`Option ${index + 1}`}
                          className="w-full md:flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                        {/* Right arrow on desktop, down arrow on mobile */}
                        <span className="hidden md:block text-gray-400 w-8 text-center">&rarr;</span>
                        <div className="flex justify-center md:hidden">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                          </svg>
                        </div>
                        <div className="md:hidden text-xs text-gray-500 font-medium">Output Value</div>
                        <input
                          type="text"
                          value={formData.optionValues[option] !== undefined ? formData.optionValues[option] : option}
                          onChange={(e) => updateOptionValue(option, e.target.value)}
                          placeholder="Output value"
                          className="w-full md:flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-gray-50"
                        />
                        {/* Desktop action buttons: reorder + remove */}
                        <div className="hidden md:flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => moveOption(index, 'up')}
                            disabled={index === 0}
                            className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-25 disabled:cursor-default"
                            title="Move up"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => moveOption(index, 'down')}
                            disabled={index === formData.options.length - 1}
                            className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-25 disabled:cursor-default"
                            title="Move down"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          {formData.options.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeOption(index)}
                              className="p-1.5 text-gray-400 hover:text-red-500"
                              title="Remove"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        </div>
                        {/* Mobile remove button */}
                        {formData.options.length > 1 && (
                          <button
                            onClick={() => removeOption(index)}
                            className="self-end md:hidden p-2 text-gray-400 hover:text-red-500"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={addOption}
                      className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Option
                    </button>
                    <button
                      type="button"
                      onClick={startBulkEdit}
                      className="text-sm text-primary-600 hover:text-primary-700"
                    >
                      Bulk edit
                    </button>
                    {formData.options.filter((o) => o.trim()).length > 1 && (
                      <button
                        type="button"
                        onClick={sortOptionsAlphabetically}
                        className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                      >
                        Sort A&ndash;Z
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Checkbox type options (read-only display) */}
          {formData.questionType === 'checkbox' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Values
              </label>
              <div className="flex gap-2">
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-lg">Yes (checked)</span>
                <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg">No (unchecked)</span>
              </div>
            </div>
          )}

          {/* Required Toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setFormData((prev) => ({ ...prev, isRequired: !prev.isRequired }))}
              className={`relative w-10 h-5 rounded-full transition-colors ${
                formData.isRequired ? 'bg-primary-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  formData.isRequired ? 'left-5' : 'left-0.5'
                }`}
              />
            </button>
            <label className="text-sm text-gray-700">
              Required question (users must answer before proceeding)
            </label>
          </div>

          {/* Display Order */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Display Order
            </label>
            <input
              type="number"
              value={formData.displayOrder}
              onChange={(e) => setFormData((prev) => ({ ...prev, displayOrder: parseInt(e.target.value) || 100 }))}
              className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Lower numbers appear first.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4 border-t">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => router.push('/import-questions')}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
