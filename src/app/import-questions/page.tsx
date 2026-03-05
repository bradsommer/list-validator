'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import type { ImportQuestion, QuestionType } from '@/lib/importQuestions';

export default function ImportQuestionsPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [questions, setQuestions] = useState<ImportQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showSavedToast, setShowSavedToast] = useState(false);

  // Drag state
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<{ index: number; position: 'above' | 'below' } | null>(null);

  useEffect(() => {
    if (searchParams.get('saved') === '1') {
      setShowSavedToast(true);
      window.history.replaceState({}, '', '/import-questions');
    }
  }, [searchParams]);

  useEffect(() => {
    if (showSavedToast) {
      const timer = setTimeout(() => setShowSavedToast(false), 3500);
      return () => clearTimeout(timer);
    }
  }, [showSavedToast]);

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

  // --- Drag and drop ---
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
    setDragIndex(null);
    setDropTarget(null);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragIndex === null || dragIndex === index) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const position = e.clientY < midY ? 'above' : 'below';
    setDropTarget({ index, position });
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    const related = e.relatedTarget as HTMLElement | null;
    if (!related || !(e.currentTarget as HTMLElement).contains(related)) {
      setDropTarget(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, index: number) => {
    e.preventDefault();

    if (dragIndex === null || !dropTarget) {
      setDragIndex(null);
      setDropTarget(null);
      return;
    }

    let toIndex = dropTarget.index;
    if (dropTarget.position === 'below') {
      toIndex += 1;
    }
    if (dragIndex < toIndex) {
      toIndex -= 1;
    }

    if (dragIndex === toIndex) {
      setDragIndex(null);
      setDropTarget(null);
      return;
    }

    const reordered = [...questions];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(toIndex, 0, moved);

    const updated = reordered.map((q, i) => ({ ...q, displayOrder: i + 1 }));
    setQuestions(updated);
    setDragIndex(null);
    setDropTarget(null);

    try {
      await Promise.all(
        updated.map((q) =>
          fetch('/api/import-questions', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: q.id, displayOrder: q.displayOrder }),
          })
        )
      );
    } catch (error) {
      console.error('Failed to save order:', error);
      await loadQuestions();
    }
  };

  const enabledCount = questions.filter((q) => q.enabled).length;

  return (
    <AdminLayout>
      {/* Success toast */}
      {showSavedToast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg animate-in fade-in slide-in-from-top-2">
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Question saved successfully
          <button onClick={() => setShowSavedToast(false)} className="ml-2 p-0.5 hover:bg-green-500 rounded">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-600">
              Configure questions shown during list import. Answers will add columns to the imported data.
            </p>
          </div>
          <Link
            href="/import-questions/new"
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Question
          </Link>
        </div>

        <div className="text-sm text-gray-500">
          {enabledCount} of {questions.length} questions enabled
        </div>

        {/* Questions List - Full Width */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
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
            questions.map((question, index) => {
              const showDropAbove = dropTarget?.index === index && dropTarget?.position === 'above' && dragIndex !== null;
              const showDropBelow = dropTarget?.index === index && dropTarget?.position === 'below' && dragIndex !== null;

              return (
              <div key={question.id} className="relative">
                {/* Drop indicator line - above */}
                {showDropAbove && (
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary-500 z-10 -translate-y-px">
                    <div className="absolute -left-1 -top-1 w-2.5 h-2.5 bg-primary-500 rounded-full" />
                  </div>
                )}

                <div
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  className={`border-b border-gray-200 overflow-hidden transition-colors ${
                    question.enabled ? 'bg-white' : 'bg-gray-50'
                  } ${dragIndex === index ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-start justify-between px-4 py-3">
                    <div className="flex items-start gap-3 flex-1">
                      {/* Drag handle */}
                      <div className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 mt-1 shrink-0" title="Drag to reorder">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <circle cx="9" cy="6" r="1.5" />
                          <circle cx="15" cy="6" r="1.5" />
                          <circle cx="9" cy="12" r="1.5" />
                          <circle cx="15" cy="12" r="1.5" />
                          <circle cx="9" cy="18" r="1.5" />
                          <circle cx="15" cy="18" r="1.5" />
                        </svg>
                      </div>

                      {/* Toggle */}
                      <button
                        onClick={() => handleToggleEnabled(question)}
                        className={`relative w-10 h-5 rounded-full transition-colors mt-1 shrink-0 ${
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
                        {question.objectTypes && question.objectTypes.length > 0 && (
                          <div className="flex items-center gap-1 mt-1">
                            {question.objectTypes.map((ot) => (
                              <span key={ot} className="px-2 py-0.5 text-xs rounded-full bg-orange-100 text-orange-700">
                                {ot}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Link
                        href={`/import-questions/${encodeURIComponent(question.id)}/edit`}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                        title="Edit"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </Link>
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

                {/* Drop indicator line - below */}
                {showDropBelow && (
                  <div className="absolute bottom-1 left-0 right-0 h-0.5 bg-primary-500 z-10">
                    <div className="absolute -left-1 -top-1 w-2.5 h-2.5 bg-primary-500 rounded-full" />
                  </div>
                )}
              </div>
              );
            })
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
