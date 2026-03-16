import type { Metadata } from 'next';
import { CrmLandingPage } from '@/components/CrmLandingPage';

export const metadata: Metadata = {
  title: 'Clean Your Salesforce Data Before Import | FreshSegments',
  description:
    'Improve Salesforce data quality by validating and cleaning your spreadsheets before import. No more Data Loader errors. Start your free trial today.',
  keywords: [
    'Salesforce data hygiene',
    'clean Salesforce data',
    'improve Salesforce imports',
    'Salesforce data quality',
    'Salesforce Data Loader cleanup',
    'Salesforce CSV validation',
    'clean spreadsheet data for Salesforce',
  ],
  openGraph: {
    title: 'Clean Your Salesforce Data Before Import | FreshSegments',
    description:
      'Stop fighting with messy Salesforce imports. FreshSegments validates and cleans your spreadsheets so Data Loader imports succeed the first time.',
  },
};

export default function SalesforcePage() {
  return <CrmLandingPage crm="salesforce" />;
}
