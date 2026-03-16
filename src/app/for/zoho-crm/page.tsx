import type { Metadata } from 'next';
import { CrmLandingPage } from '@/components/CrmLandingPage';

export const metadata: Metadata = {
  title: 'Clean Your Zoho CRM Data Before Import | FreshSegments',
  description:
    'Improve Zoho CRM data hygiene by validating and cleaning spreadsheets before import. Eliminate duplicates and formatting issues. Start your free trial.',
  keywords: [
    'Zoho CRM data hygiene',
    'clean Zoho CRM data',
    'improve Zoho CRM imports',
    'Zoho CRM data quality',
    'Zoho CRM import tool',
    'Zoho CRM CSV cleanup',
    'clean spreadsheet data for Zoho CRM',
  ],
  openGraph: {
    title: 'Clean Your Zoho CRM Data Before Import | FreshSegments',
    description:
      'Stop importing messy data into Zoho CRM. FreshSegments validates and cleans your spreadsheets so every import is flawless.',
  },
};

export default function ZohoCrmPage() {
  return <CrmLandingPage crm="zoho-crm" />;
}
