'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { StepIndicator } from '@/components/layout/StepIndicator';
import { LogViewer } from '@/components/layout/LogViewer';
import { FileUpload } from '@/components/upload/FileUpload';
import { HeaderMapper } from '@/components/mapping/HeaderMapper';
import { ValidationResults } from '@/components/validation/ValidationResults';
import { EnrichmentPanel } from '@/components/enrichment/EnrichmentPanel';
import { HubSpotSync } from '@/components/hubspot/HubSpotSync';
import { AuditReview } from '@/components/audit/AuditReview';

export default function ImportPage() {
  const { currentStep, reset, loadFieldMappingsFromHubSpot } = useAppStore();

  // Reset import state on mount so the page always starts fresh,
  // then reload field mappings since reset() clears them
  useEffect(() => {
    reset();
    loadFieldMappingsFromHubSpot();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
