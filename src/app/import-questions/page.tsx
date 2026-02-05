'use client';

import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import type { ImportQuestion, QuestionType } from '@/lib/importQuestions';

export default function ImportQuestionsPage() {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<ImportQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingQuestion, setEditingQuestion] = useState<ImportQuestion | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    questionText: '',
    columnHeader: '',
    questionType: 'dropdown' as QuestionType,
    options: [''],
    defaultValue: '',
    isRequired: false,
    displayOrder: 100,
    enabled: true,
  });

  // Helper to get display label for question type
  const getQuestionTypeLabel = (type: QuestionType): string => {
    switch (type) {
      case 'text': return 'Free Text';
      case 'dropdown': return 'Dropdown';
      case 'checkbox': return 'Checkbox';
      case 'radio': return 'Radio Select';
      case 'multiselect': return 'Multiple Select';
      default: return type;
    }
  };

  // Helper to get badge color for question type
  const getQuestionTypeBadgeClass = (type: QuestionType): string => {
    switch (type) {
      case 'text': return 'bg-gray-100 text-gray-700';
      case 'dropdown': return 'bg-blue-100 text-blue-700';
      case 'checkbox': return 'bg-purple-100 text-purple-700';
      case 'radio': return 'bg-green-100 text-green-700';
      case 'multiselect': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // Check if question type needs options
  const needsOptions = (type: QuestionType): boolean => {
    return type === 'dropdown' || type === 'radio' || type === 'multiselect';
  };

  const accountId = user?.accountId || 'default';

  const loadQuestions = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/import-questions?accountId=${encodeURIComponent(accountId)}`);
      const data = await response.json();
      if (data.success) {
        setQuestions(data.questions);
      }
    } catch (error) {
      console.error('Failed to load questions:', error);
    }
    setIsLoading(false);
  }, [accountId]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  const resetForm = () => {
    setFormData({
      questionText: '',
      columnHeader: '',
      questionType: 'dropdown',
      options: [''],
      defaultValue: '',
      isRequired: false,
      displayOrder: 100,
      enabled: true,
    });
    setEditingQuestion(null);
    setIsCreating(false);
  };

  const handleEdit = (question: ImportQuestion) => {
    setEditingQuestion(question);
    setIsCreating(false);
    setFormData({
      questionText: question.questionText,
      columnHeader: question.columnHeader,
      questionType: question.questionType,
      options: question.options.length > 0 ? question.options : [''],
      defaultValue: question.defaultValue || '',
      isRequired: question.isRequired,
      displayOrder: question.displayOrder,
      enabled: question.enabled,
    });
  };

  const handleCreate = () => {
    resetForm();
    setIsCreating(true);
  };

  const handleSave = async () => {
    if (!formData.questionText || !formData.columnHeader) {
      alert('Please fill in the question text and column header');
      return;
    }

    // Filter out empty options
    const cleanOptions = formData.options.filter((opt) => opt.trim() !== '');
    if (needsOptions(formData.questionType) && cleanOptions.length === 0) {
      alert('Please add at least one option');
      return;
    }

    setIsSaving(true);

    try {
      if (editingQuestion) {
        // Update existing
        const response = await fetch('/api/import-questions', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingQuestion.id,
            questionText: formData.questionText,
            columnHeader: formData.columnHeader,
            questionType: formData.questionType,
            options: cleanOptions,
            defaultValue: formData.defaultValue.trim() || null,
            isRequired: formData.isRequired,
            displayOrder: formData.displayOrder,
            enabled: formData.enabled,
          }),
        });

        if (response.ok) {
          await loadQuestions();
          resetForm();
        }
      } else {
        // Create new
        const response = await fetch('/api/import-questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accountId,
            questionText: formData.questionText,
            columnHeader: formData.columnHeader,
            questionType: formData.questionType,
            options: cleanOptions,
            defaultValue: formData.defaultValue.trim() || null,
            isRequired: formData.isRequired,
            displayOrder: formData.displayOrder,
            enabled: formData.enabled,
          }),
        });

        if (response.ok) {
          await loadQuestions();
          resetForm();
        }
      }
    } catch (error) {
      console.error('Failed to save question:', error);
    }

    setIsSaving(false);
  };

  const handleDelete = async (question: ImportQuestion) => {
    if (!confirm(`Are you sure you want to delete "${question.questionText}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/import-questions?id=${encodeURIComponent(question.id)}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadQuestions();
        if (editingQuestion?.id === question.id) {
          resetForm();
        }
      }
    } catch (error) {
      console.error('Failed to delete question:', error);
    }
  };

  const handleToggleEnabled = async (question: ImportQuestion) => {
    try {
      const response = await fetch('/api/import-questions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: question.id,
          enabled: !question.enabled,
        }),
      });

      if (response.ok) {
        setQuestions((prev) =>
          prev.map((q) => (q.id === question.id ? { ...q, enabled: !q.enabled } : q))
        );
      }
    } catch (error) {
      console.error('Failed to toggle question:', error);
    }
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
    setFormData((prev) => ({
      ...prev,
      options: prev.options.map((opt, i) => (i === index ? value : opt)),
    }));
  };

  const enabledCount = questions.filter((q) => q.enabled).length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-600">
              Configure questions shown during list import. Answers will add columns to the imported data.
            </p>
          </div>
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Question
          </button>
        </div>

        <div className="text-sm text-gray-500">
          {enabledCount} of {questions.length} questions enabled
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Questions List */}
          <div className="space-y-3">
            {isLoading ? (
              <div className="text-center py-12 text-gray-500">
                <div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-2" />
                Loading...
              </div>
            ) : questions.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-gray-600 font-medium">No import questions yet</p>
                <p className="text-sm text-gray-500 mt-1">
                  Click &quot;Add Question&quot; to create your first question.
                </p>
              </div>
            ) : (
              questions.map((question) => (
                <div
                  key={question.id}
                  className={`border rounded-lg overflow-hidden ${
                    question.enabled ? 'border-green-200 bg-white' : 'border-gray-200 bg-gray-50'
                  } ${editingQuestion?.id === question.id ? 'ring-2 ring-primary-500' : ''}`}
                >
                  <div className="flex items-start justify-between px-4 py-3">
                    <div className="flex items-start gap-3 flex-1">
                      {/* Toggle */}
                      <button
                        onClick={() => handleToggleEnabled(question)}
                        className={`relative w-10 h-5 rounded-full transition-colors mt-1 ${
                          question.enabled ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                            question.enabled ? 'left-5' : 'left-0.5'
                          }`}
                        />
                      </button>

                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{question.questionText}</span>
                          {question.isRequired && (
                            <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full">
                              Required
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm text-gray-500">
                            Column: <strong>{question.columnHeader}</strong>
                          </span>
                          <span
                            className={`px-2 py-0.5 text-xs rounded-full ${getQuestionTypeBadgeClass(question.questionType)}`}
                          >
                            {getQuestionTypeLabel(question.questionType)}
                          </span>
                        </div>
                        {question.options.length > 0 && !question.defaultValue && (
                          <div className="mt-1 text-xs text-gray-400">
                            Options: {question.options.join(', ')}
                          </div>
                        )}
                        {question.defaultValue && (
                          <div className="mt-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded inline-block">
                            Default: &quot;{question.defaultValue}&quot; (applied to all rows)
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEdit(question)}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                        title="Edit"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(question)}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                        title="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Edit/Create Form */}
          {(isCreating || editingQuestion) && (
            <div className="border rounded-lg bg-white p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingQuestion ? 'Edit Question' : 'New Question'}
                </h3>
                <button
                  onClick={resetForm}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
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
                      Options
                    </label>
                    <div className="space-y-2">
                      {formData.options.map((option, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={option}
                            onChange={(e) => updateOption(index, e.target.value)}
                            placeholder={`Option ${index + 1}`}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
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

                {/* Default Value / Bulk Edit */}
                <div className="border-t pt-4 mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Set Default Value for All Contacts
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Set value for all contacts to:</span>
                    <input
                      type="text"
                      value={formData.defaultValue}
                      onChange={(e) => setFormData((prev) => ({ ...prev, defaultValue: e.target.value }))}
                      placeholder="Enter value..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.defaultValue.trim()
                      ? `All rows will have "${formData.defaultValue.trim()}" in the "${formData.columnHeader || 'column'}" column. Users won't be asked this question.`
                      : 'Leave empty to ask users during import. Set a value to apply it to all rows automatically.'}
                  </p>
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
                    {isSaving ? 'Saving...' : editingQuestion ? 'Update Question' : 'Create Question'}
                  </button>
                  <button
                    onClick={resetForm}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Help Text when no form is open */}
          {!isCreating && !editingQuestion && questions.length > 0 && (
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 flex items-center justify-center">
              <div className="text-center text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <p className="text-sm">Select a question to edit or click &quot;Add Question&quot; to create a new one.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
