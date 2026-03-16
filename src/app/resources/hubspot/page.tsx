import type { Metadata } from 'next';
import { CrmLandingPage } from '@/components/CrmLandingPage';

export const metadata: Metadata = {
  title: 'Clean Your HubSpot Data Before Import | FreshSegments',
  description:
    'Improve HubSpot data hygiene by cleaning and validating your spreadsheets before import. Stop spending time on manual data cleanup. Start your free trial today.',
  keywords: [
    'HubSpot data hygiene',
    'clean HubSpot data',
    'improve HubSpot imports',
    'HubSpot data quality',
    'HubSpot import tool',
    'HubSpot CSV cleanup',
    'clean spreadsheet data for HubSpot',
  ],
  openGraph: {
    title: 'Clean Your HubSpot Data Before Import | FreshSegments',
    description:
      'Stop importing messy data into HubSpot. FreshSegments automatically validates, standardizes, and cleans your spreadsheets so every HubSpot import is flawless.',
  },
};

export default function HubSpotPage() {
  return <CrmLandingPage crm="hubspot" />;
}
