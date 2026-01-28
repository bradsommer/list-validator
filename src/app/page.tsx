'use client';

import Link from 'next/link';
import { useAppStore } from '@/store/useAppStore';
import { useAuth } from '@/contexts/AuthContext';
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
  const { user, isAuthenticated, isAdmin, logout, isLoading } = useAuth();

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

  // Show loading state
  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </main>
    );
  }

  // Show login prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
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
          </div>
        </header>

        {/* Login prompt */}
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Sign in to continue
            </h2>
            <p className="text-gray-500 mb-6">
              You need to be logged in to use the List Validator.
            </p>
            <Link
              href="/login"
              className="inline-block px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
            >
              Sign In
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
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

            {/* Navigation */}
            <nav className="flex items-center gap-4">
              {isAdmin && (
                <Link
                  href="/admin/mappings"
                  className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  Admin
                </Link>
              )}
              <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
                <span className="text-sm text-gray-600">
                  {user?.displayName || user?.username}
                </span>
                <button
                  onClick={() => logout()}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Sign out
                </button>
              </div>
            </nav>
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
