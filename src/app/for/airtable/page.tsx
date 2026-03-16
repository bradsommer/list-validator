import type { Metadata } from 'next';
import { CrmLandingPage } from '@/components/CrmLandingPage';

export const metadata: Metadata = {
  title: 'Clean Your Airtable Data Before Import | FreshSegments',
  description:
    'Improve Airtable data quality by cleaning and validating spreadsheets before import. Keep your bases organized and your automations reliable.',
  keywords: [
    'Airtable data hygiene',
    'clean Airtable data',
    'improve Airtable imports',
    'Airtable data quality',
    'Airtable import tool',
    'Airtable CSV cleanup',
    'clean spreadsheet data for Airtable',
  ],
  openGraph: {
    title: 'Clean Your Airtable Data Before Import | FreshSegments',
    description:
      'Stop importing messy data into Airtable. FreshSegments validates and cleans your spreadsheets so your bases stay organized.',
  },
};

export default function AirtablePage() {
  return <CrmLandingPage crm="airtable" />;
}
