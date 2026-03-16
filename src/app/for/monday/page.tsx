import type { Metadata } from 'next';
import { CrmLandingPage } from '@/components/CrmLandingPage';

export const metadata: Metadata = {
  title: 'Clean Your monday.com Data Before Import | FreshSegments',
  description:
    'Improve monday.com data quality by cleaning and validating spreadsheets before import. Keep your boards organized and free of duplicates.',
  keywords: [
    'monday.com data hygiene',
    'clean monday.com data',
    'improve monday.com imports',
    'monday.com data quality',
    'monday.com import tool',
    'monday.com CSV cleanup',
    'clean spreadsheet data for monday.com',
  ],
  openGraph: {
    title: 'Clean Your monday.com Data Before Import | FreshSegments',
    description:
      'Stop importing messy data into monday.com. FreshSegments validates and cleans your spreadsheets so your boards stay organized.',
  },
};

export default function MondayPage() {
  return <CrmLandingPage crm="monday" />;
}
