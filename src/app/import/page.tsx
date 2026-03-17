'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/store/useAppStore';
import { useAuth } from '@/contexts/AuthContext';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { StepIndicator } from '@/components/layout/StepIndicator';
import { FileUpload } from '@/components/upload/FileUpload';
import { ColumnMapper } from '@/components/upload/ColumnMapper';
import { ImportQuestionsStep } from '@/components/upload/ImportQuestionsStep';
import { RulesStep } from '@/components/upload/RulesStep';
import { ValidationResults } from '@/components/validation/ValidationResults';

// Maps step name → component
const STEP_COMPONENTS: Record<string, React.FC<{ onCancel?: () => void }>> = {
  Upload: FileUpload,
  Questions: ImportQuestionsStep,
  Rules: RulesStep,
  'Map Columns': ColumnMapper,
  Finish: ValidationResults,
};

export default function ImportPage() {
  const { currentStep, steps, reset, setSteps } = useAppStore();
  const { user } = useAuth();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  const accountId = user?.accountId || 'default';

  const initSteps = useCallback(async () => {
    // Check which optional steps the account actually needs
    const [rulesRes, questionsRes] = await Promise.all([
      fetch(`/api/account-rules?accountId=${encodeURIComponent(accountId)}`).then(r => r.json()).catch(() => ({ data: [] })),
      fetch(`/api/import-questions?accountId=${encodeURIComponent(accountId)}`).then(r => r.json()).catch(() => ({ questions: [] })),
    ]);

    const hasRules = (rulesRes.data || []).length > 0;
    const hasQuestions = (questionsRes.questions || []).filter((q: { enabled: boolean }) => q.enabled).length > 0;

    const dynamicSteps = ['Upload'];
    if (hasQuestions) dynamicSteps.push('Questions');
    if (hasRules) dynamicSteps.push('Rules');
    dynamicSteps.push('Map Columns', 'Finish');

    setSteps(dynamicSteps);
    setIsReady(true);
  }, [accountId, setSteps]);

  // Reset import state on mount so the page always starts fresh.
  // Also clean up any legacy localStorage keys from older code versions.
  useEffect(() => {
    reset();
    try {
      localStorage.removeItem('enabled_validation_rules');
      localStorage.removeItem('known_validation_rules');
    } catch {
      // localStorage unavailable
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Build dynamic steps after reset
  useEffect(() => {
    initSteps();
  }, [initSteps]);

  const handleCancel = () => {
    router.push('/');
  };

  if (!isReady) {
    return (
      <AdminLayout hideChrome>
        <div className="max-w-5xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-500">Preparing import...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const currentStepName = steps[currentStep] || 'Upload';
  const StepComponent = STEP_COMPONENTS[currentStepName] || FileUpload;

  return (
    <AdminLayout hideChrome>
      {/* Step indicator */}
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <StepIndicator />
        </div>

        {/* Main content */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <StepComponent onCancel={handleCancel} />
        </div>
      </div>
    </AdminLayout>
  );
}
