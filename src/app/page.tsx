'use client';

import { useAppStore } from '@/store/useAppStore';
import { StepIndicator } from '@/components/layout/StepIndicator';
import { LogViewer } from '@/components/layout/LogViewer';
import { FileUpload } from '@/components/upload/FileUpload';
import { HeaderMapper } from '@/components/mapping/HeaderMapper';
import { ValidationResults } from '@/components/validation/ValidationResults';
import { EnrichmentPanel } from '@/components/enrichment/EnrichmentPanel';
import { HubSpotSync } from '@/components/hubspot/HubSpotSync';
import { AuditReview } from '@/components/audit/AuditReview';

export default function Home() {
  const { currentStep } = useAppStore();

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <FileUpload />;
      case 1:
        return <HeaderMapper />;
      case 2:
        return <ValidationResults />;
      case 3:
        return <EnrichmentPanel />;
      case 4:
        return <HubSpotSync />;
      case 5:
        return <AuditReview />;
      default:
        return <FileUpload />;
    }
  };

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-hubspot-orange rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Ascend HubSpot List Validator
              </h1>
              <p className="text-sm text-gray-500">
                Validate, enrich, and sync your lists to HubSpot
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Step indicator */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <StepIndicator />
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 pb-24">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {renderStep()}
        </div>
      </div>

      {/* Log viewer */}
      <LogViewer />
    </main>
  );
}
