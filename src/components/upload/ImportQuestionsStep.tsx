'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAppStore, type QuestionAnswer } from '@/store/useAppStore';
import { useAuth } from '@/contexts/AuthContext';
import type { ImportQuestion } from '@/lib/importQuestions';
import { appliesToObjectType, getObjectTypeLabel } from '@/lib/objectTypes';

interface QuestionInputProps {
  question: ImportQuestion;
  answer: QuestionAnswer | undefined;
  onAnswer: (answer: QuestionAnswer) => void;
}

function QuestionInput({ question, answer, onAnswer }: QuestionInputProps) {
  const [isOverride, setIsOverride] = useState(answer?.isOverride || false);
  const [selectedValue, setSelectedValue] = useState(answer?.value || '');
  const [overrideValue, setOverrideValue] = useState(
    answer?.isOverride ? answer?.value || '' : ''
  );

  // Get the output value for a selected option
  const getOutputValue = (optionLabel: string): string => {
    if (question.optionValues && question.optionValues[optionLabel]) {
      return question.optionValues[optionLabel];
    }
    return optionLabel;
  };

  // Update parent when values change
  useEffect(() => {
    if (isOverride) {
      onAnswer({ value: overrideValue, isOverride: true });
    } else if (selectedValue) {
      onAnswer({ value: getOutputValue(selectedValue), isOverride: false });
    }
  }, [isOverride, selectedValue, overrideValue]); // eslint-disable-line react-hooks/exhaustive-deps

  // Render different input types
  const renderInput = () => {
    switch (question.questionType) {
      case 'text':
        return (
          <input
            type="text"
            value={selectedValue}
            onChange={(e) => {
              setSelectedValue(e.target.value);
              onAnswer({ value: e.target.value, isOverride: false });
            }}
            placeholder="Enter value..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        );

      case 'dropdown':
        return (
          <select
            value={selectedValue}
            onChange={(e) => setSelectedValue(e.target.value)}
            disabled={isOverride}
            className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
              isOverride ? 'bg-gray-100 text-gray-500' : ''
            }`}
          >
            <option value="">Select an option...</option>
            {question.options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        );

      case 'checkbox':
        return (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                const newValue = selectedValue === 'Yes' ? 'No' : 'Yes';
                setSelectedValue(newValue);
              }}
              disabled={isOverride}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                selectedValue === 'Yes' ? 'bg-green-500' : 'bg-gray-300'
              } ${isOverride ? 'opacity-50' : ''}`}
            >
              <span
                className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  selectedValue === 'Yes' ? 'left-7' : 'left-1'
                }`}
              />
            </button>
            <span className={`text-sm ${isOverride ? 'text-gray-400' : 'text-gray-700'}`}>
              {selectedValue === 'Yes' ? 'Yes' : 'No'}
            </span>
          </div>
        );

      case 'radio':
        return (
          <div className="space-y-2">
            {question.options.map((opt) => (
              <label
                key={opt}
                className={`flex items-center gap-2 cursor-pointer ${
                  isOverride ? 'opacity-50 pointer-events-none' : ''
                }`}
              >
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  value={opt}
                  checked={selectedValue === opt}
                  onChange={(e) => setSelectedValue(e.target.value)}
                  disabled={isOverride}
                  className="w-4 h-4 text-primary-500 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">{opt}</span>
              </label>
            ))}
          </div>
        );

      case 'multiselect':
        const selectedOptions = selectedValue ? selectedValue.split(', ') : [];
        return (
          <div className="space-y-2">
            {question.options.map((opt) => (
              <label
                key={opt}
                className={`flex items-center gap-2 cursor-pointer ${
                  isOverride ? 'opacity-50 pointer-events-none' : ''
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedOptions.includes(opt)}
                  onChange={(e) => {
                    let newSelected: string[];
                    if (e.target.checked) {
                      newSelected = [...selectedOptions, opt];
                    } else {
                      newSelected = selectedOptions.filter((o) => o !== opt);
                    }
                    const newValue = newSelected.join(', ');
                    setSelectedValue(newValue);
                    onAnswer({
                      value: newSelected.map(getOutputValue).join(', '),
                      isOverride: false,
                    });
                  }}
                  disabled={isOverride}
                  className="w-4 h-4 text-primary-500 focus:ring-primary-500 rounded"
                />
                <span className="text-sm text-gray-700">{opt}</span>
              </label>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  // Check if override is applicable (not for text type)
  const showOverride = question.questionType !== 'text';

  return (
    <div className="border rounded-lg p-4 bg-white">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-medium text-gray-900">
            {question.questionText}
            {question.isRequired && <span className="text-red-500 ml-1">*</span>}
          </h4>
          <p className="text-sm text-gray-500 mt-1">
            Column: <strong>{question.columnHeader}</strong>
          </p>
        </div>
      </div>

      {/* Main input */}
      <div className="mb-3">{renderInput()}</div>

      {/* Override option */}
      {showOverride && (
        <div className="border-t pt-3 mt-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isOverride}
              onChange={(e) => {
                setIsOverride(e.target.checked);
                if (!e.target.checked) {
                  // When unchecking override, use the selected value
                  if (selectedValue) {
                    onAnswer({ value: getOutputValue(selectedValue), isOverride: false });
                  }
                }
              }}
              className="w-4 h-4 text-primary-500 focus:ring-primary-500 rounded"
            />
            <span className="text-sm text-gray-600">Override with custom value</span>
          </label>

          {isOverride && (
            <div className="mt-2">
              <input
                type="text"
                value={overrideValue}
                onChange={(e) => setOverrideValue(e.target.value)}
                placeholder="Enter custom value for all contacts..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                This value will be applied to all rows instead of the selection above.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ImportQuestionsStep() {
  const { user } = useAuth();
  const {
    questionAnswers,
    setQuestionAnswer,
    setQuestionColumnValues,
    processedData,
    setProcessedData,
    selectedObjectType,
    nextStep,
    prevStep,
  } = useAppStore();

  const [questions, setQuestions] = useState<ImportQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const accountId = user?.accountId || 'default';

  const loadQuestions = useCallback(async () => {
    setIsLoading(true);
    try {
      // Add cache-busting parameter to ensure fresh data
      const response = await fetch(
        `/api/import-questions?accountId=${encodeURIComponent(accountId)}&_t=${Date.now()}`
      );
      const data = await response.json();
      if (data.success) {
        // Filter to enabled questions that apply to the selected object type
        const activeQuestions = selectedObjectType
          ? data.questions.filter(
              (q: ImportQuestion) =>
                q.enabled && appliesToObjectType(q.objectTypes, selectedObjectType)
            )
          : data.questions.filter((q: ImportQuestion) => q.enabled);
        setQuestions(activeQuestions);
      }
    } catch (error) {
      console.error('Failed to load questions:', error);
    }
    setIsLoading(false);
  }, [accountId, selectedObjectType]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  const handleAnswer = (questionId: string, answer: QuestionAnswer) => {
    setQuestionAnswer(questionId, answer);
  };

  const handleContinue = () => {
    // Validate required questions
    for (const question of questions) {
      if (question.isRequired) {
        const answer = questionAnswers[question.id];
        if (!answer || !answer.value.trim()) {
          alert(`Please answer the required question: "${question.questionText}"`);
          return;
        }
      }
    }

    // Build a map of column header → value to apply from user answers
    const columnsToAdd: Record<string, string> = {};

    for (const question of questions) {
      const answer = questionAnswers[question.id];
      if (answer && answer.value.trim()) {
        columnsToAdd[question.columnHeader] = answer.value;
      }
    }

    // Store the question column values for use after validation
    // This ensures the values persist even when validation re-runs from original data
    setQuestionColumnValues(columnsToAdd);

    // Apply to all rows
    if (Object.keys(columnsToAdd).length > 0) {
      const updatedData = processedData.map((row) => ({
        ...row,
        ...columnsToAdd,
      }));
      setProcessedData(updatedData);
    }

    nextStep();
  };

  // If no questions to show, auto-advance (but still apply defaults)
  useEffect(() => {
    if (!isLoading && questions.length === 0) {
      handleContinue();
    }
  }, [isLoading, questions.length]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-gray-500">Loading questions...</p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Processing...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Import Questions</h2>
        <p className="text-gray-600 mt-1">
          Answer the following questions to add data to your{' '}
          {selectedObjectType ? getObjectTypeLabel(selectedObjectType).toLowerCase() : ''} import.
        </p>
      </div>

      <div className="space-y-4">
        {questions.map((question) => (
          <QuestionInput
            key={question.id}
            question={question}
            answer={questionAnswers[question.id]}
            onAnswer={(answer) => handleAnswer(question.id, answer)}
          />
        ))}
      </div>

      <div className="flex items-center justify-between pt-4 border-t">
        <button
          onClick={prevStep}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <button
          onClick={handleContinue}
          className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 flex items-center gap-2"
        >
          Continue
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
