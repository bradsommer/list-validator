'use client';

import { useAppStore } from '@/store/useAppStore';
import type { HubSpotObjectType } from '@/types';

const OBJECT_TYPE_OPTIONS: { value: HubSpotObjectType; label: string; description: string }[] = [
  { value: 'contacts', label: 'Contacts', description: 'People and individuals' },
  { value: 'companies', label: 'Companies', description: 'Organizations and businesses' },
  { value: 'deals', label: 'Deals', description: 'Sales opportunities and transactions' },
];

export function ObjectTypeStep() {
  const { objectType, setObjectType, nextStep, prevStep } = useAppStore();

  const handleContinue = () => {
    if (!objectType) {
      alert('Please select the type of records you are importing.');
      return;
    }
    nextStep();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Object Type</h2>
        <p className="text-gray-600 mt-1">
          Select the type of HubSpot records you are importing.
        </p>
      </div>

      <div className="border rounded-lg p-6 bg-white">
        <h4 className="font-medium text-gray-900 mb-1">
          What type of records are you importing?
          <span className="text-red-500 ml-1">*</span>
        </h4>
        <p className="text-sm text-gray-500 mb-4">
          This determines which questions are shown and which HubSpot properties are available for column mapping.
        </p>
        <div className="grid grid-cols-3 gap-3">
          {OBJECT_TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setObjectType(opt.value)}
              className={`flex flex-col items-center px-4 py-4 rounded-lg border-2 transition-colors ${
                objectType === opt.value
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 hover:border-gray-300 text-gray-700'
              }`}
            >
              <span className="font-medium">{opt.label}</span>
              <span className="text-xs text-gray-500 mt-0.5">{opt.description}</span>
            </button>
          ))}
        </div>
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
