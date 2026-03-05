'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import type { ImportQuestion, QuestionType } from '@/lib/importQuestions';

export default function EditImportQuestionPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const questionId = decodeURIComponent(params.questionId as string);

  const [question, setQuestion] = useState<ImportQuestion | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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

  const accountId = user?.accountId || 'default';

  const needsOptions = (type: QuestionType): boolean => {
    return type === 'dropdown' || type === 'radio' || type === 'multiselect';
  };

  const loadQuestion = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/import-questions?accountId=${encodeURIComponent(accountId)}`);
      const data = await response.json();
      if (data.success) {
        const found = data.questions.find((q: ImportQuestion) => q.id === questionId);
        if (found) {
          setQuestion(found);
          setFormData({
            questionText: found.questionText,
            columnHeader: found.columnHeader,
            questionType: found.questionType,
            options: found.options.length > 0 ? found.options : [''],
            optionValues: found.optionValues || {},
            isRequired: found.isRequired,
            displayOrder: found.displayOrder,
            enabled: found.enabled,
          });
        }
      }
    } catch (error) {
      console.error('Failed to load question:', error);
    }
    setIsLoading(false);
  }, [accountId, questionId]);

  useEffect(() => {
    if (!isAuthLoading) {
      loadQuestion();
    }
  }, [loadQuestion, isAuthLoading]);

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
        router.push('/import-questions?saved=1');
        return;
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

  const updateOption = (index: number, value: string) => {
    const oldOption = formData.options[index];
    setFormData((prev) => {
      const newOptionValues = { ...prev.optionValues };
      if (oldOption && oldOption !== value && newOptionValues[oldOption]) {
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
    setFormData((prev) => ({
      ...prev,
      optionValues: { ...prev.optionValues, [optionLabel]: outputValue },
    }));
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="text-center py-12 text-gray-500">
          <div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-2" />
          Loading question...
        </div>
      </AdminLayout>
    );
  }

  if (!question) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <p className="text-gray-600 font-medium">Question not found</p>
          <Link href="/import-questions" className="text-primary-600 hover:underline mt-2 inline-block">
            Back to Import Questions
          </Link>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout hideChrome>
      <div className="space-y-6">
        {/* Fixed top save bar */}
        <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3 shadow-md" style={{ backgroundColor: '#0d9487' }}>
          <div className="flex items-center gap-3">
            <Link
              href="/import-questions"
              className="p-2 text-green-200 hover:text-white hover:bg-green-700 rounded"
              title="Back to Import Questions"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h2 className="text-lg font-semibold text-white">Edit Question</h2>
              <p className="text-sm text-green-200">{question.questionText}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/import-questions"
              className="px-4 py-2 text-sm text-green-200 hover:text-white"
            >
              Cancel
            </Link>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2.5 text-sm font-medium text-green-900 rounded-lg hover:opacity-90 disabled:opacity-50 shadow-sm"
              style={{ backgroundColor: '#EEE5BF' }}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        {/* Spacer for fixed top bar */}
        <div className="h-16"></div>

        {/* Form */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-5">
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
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                  <div className="flex-1">Option (what user sees)</div>
                  <div className="w-8"></div>
                  <div className="flex-1">Output Value (leave empty = same as option)</div>
                  <div className="w-9"></div>
                </div>
                {formData.options.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => updateOption(index, e.target.value)}
                      placeholder={`Option ${index + 1}`}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                    <span className="text-gray-400 w-8 text-center">&rarr;</span>
                    <input
                      type="text"
                      value={formData.optionValues[option] || ''}
                      onChange={(e) => updateOptionValue(option, e.target.value)}
                      placeholder={option || 'Output value'}
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-gray-50"
                    />
                    {formData.options.length > 1 && (
                      <button
                        onClick={() => removeOption(index)}
                        className="p-2 text-gray-400 hover:text-red-500"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={addOption}
                  className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Option
                </button>
              </div>
            </div>
          )}

          {/* Checkbox type options */}
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
        </div>

      </div>
    </AdminLayout>
  );
}
