'use client';

import { useAppStore } from '@/store/useAppStore';
import { OBJECT_TYPES, type ObjectType } from '@/lib/objectTypes';

const icons: Record<string, React.ReactNode> = {
  user: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  building: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  dollar: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

export function ObjectTypeStep() {
  const { selectedObjectType, setSelectedObjectType, nextStep, prevStep } = useAppStore();

  const handleSelect = (type: ObjectType) => {
    setSelectedObjectType(type);
  };

  const handleContinue = () => {
    if (!selectedObjectType) {
      alert('Please select an object type to continue.');
      return;
    }
    nextStep();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">What are you validating?</h2>
        <p className="text-gray-600 mt-1">
          Select the type of HubSpot object you are importing. This will show relevant questions and rules.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {OBJECT_TYPES.map((type) => (
          <button
            key={type.value}
            onClick={() => handleSelect(type.value)}
            className={`p-6 rounded-xl border-2 transition-all text-left ${
              selectedObjectType === type.value
                ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div className={`mb-3 ${selectedObjectType === type.value ? 'text-primary-600' : 'text-gray-500'}`}>
              {icons[type.icon]}
            </div>
            <h3 className={`text-lg font-semibold ${
              selectedObjectType === type.value ? 'text-primary-900' : 'text-gray-900'
            }`}>
              {type.label}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {type.value === 'contacts' && 'People in your CRM'}
              {type.value === 'companies' && 'Organizations in your CRM'}
              {type.value === 'deals' && 'Sales opportunities'}
            </p>
          </button>
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
          disabled={!selectedObjectType}
          className={`px-6 py-2 rounded-lg flex items-center gap-2 ${
            selectedObjectType
              ? 'bg-primary-500 text-white hover:bg-primary-600'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
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
