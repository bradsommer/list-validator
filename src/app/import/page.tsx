'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { StepIndicator } from '@/components/layout/StepIndicator';
import { LogViewer } from '@/components/layout/LogViewer';
import { FileUpload } from '@/components/upload/FileUpload';
import { ValidationResults } from '@/components/validation/ValidationResults';
import { AuditReview } from '@/components/audit/AuditReview';

export default function ImportPage() {
  const { currentStep, reset } = useAppStore();

  // Reset import state on mount so the page always starts fresh
  useEffect(() => {
    reset();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <FileUpload />;
      case 1:
        return <ValidationResults />;
      case 2:
        return <AuditReview />;
      default:
        return <FileUpload />;
    }
  };

  return (
    <AdminLayout>
      {/* Step indicator */}
      <div className="mb-6">
        <StepIndicator />
      </div>

      {/* Main content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        {renderStep()}
      </div>

      {/* Log viewer */}
      <LogViewer />
    </AdminLayout>
  );
}
