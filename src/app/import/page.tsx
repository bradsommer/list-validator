'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/store/useAppStore';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { StepIndicator } from '@/components/layout/StepIndicator';
import { FileUpload } from '@/components/upload/FileUpload';
import { ColumnMapper } from '@/components/upload/ColumnMapper';
import { ImportQuestionsStep } from '@/components/upload/ImportQuestionsStep';
import { RulesStep } from '@/components/upload/RulesStep';
import { ValidationResults } from '@/components/validation/ValidationResults';

export default function ImportPage() {
  const { currentStep, reset } = useAppStore();
  const router = useRouter();

  // Reset import state on mount so the page always starts fresh.
  // Also clean up any legacy localStorage keys from older code versions.
  useEffect(() => {
    reset();
    // Remove legacy keys that used an enabled-list approach (replaced by disabled-list)
    try {
      localStorage.removeItem('enabled_validation_rules');
      localStorage.removeItem('known_validation_rules');
    } catch {
      // localStorage unavailable
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCancel = () => {
    router.push('/');
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <FileUpload onCancel={handleCancel} />;
      case 1:
        return <ImportQuestionsStep onCancel={handleCancel} />;
      case 2:
        return <RulesStep onCancel={handleCancel} />;
      case 3:
        return <ColumnMapper onCancel={handleCancel} />;
      case 4:
        return <ValidationResults onCancel={handleCancel} />;
      default:
        return <FileUpload onCancel={handleCancel} />;
    }
  };

  return (
    <AdminLayout hideChrome>
      {/* Step indicator */}
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <StepIndicator />
        </div>

        {/* Main content */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          {renderStep()}
        </div>
      </div>
    </AdminLayout>
  );
}
