import type { Metadata } from 'next';
import { CrmLandingPage } from '@/components/CrmLandingPage';

export const metadata: Metadata = {
  title: 'Clean Your Pipedrive Data Before Import | FreshSegments',
  description:
    'Improve Pipedrive data quality by cleaning and validating spreadsheets before import. Keep your pipeline accurate and free of duplicates.',
  keywords: [
    'Pipedrive data hygiene',
    'clean Pipedrive data',
    'improve Pipedrive imports',
    'Pipedrive data quality',
    'Pipedrive import tool',
    'Pipedrive CSV cleanup',
    'clean spreadsheet data for Pipedrive',
  ],
  openGraph: {
    title: 'Clean Your Pipedrive Data Before Import | FreshSegments',
    description:
      'Stop importing messy data into Pipedrive. FreshSegments validates and cleans your spreadsheets so your pipeline stays accurate.',
  },
};

export default function PipedrivePage() {
  return <CrmLandingPage crm="pipedrive" />;
}
