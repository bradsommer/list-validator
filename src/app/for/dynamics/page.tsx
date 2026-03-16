import type { Metadata } from 'next';
import { CrmLandingPage } from '@/components/CrmLandingPage';

export const metadata: Metadata = {
  title: 'Clean Your Dynamics 365 Data Before Import | FreshSegments',
  description:
    'Improve Dynamics 365 data quality by cleaning and validating spreadsheets before import. Eliminate import errors and keep your CRM data consistent.',
  keywords: [
    'Dynamics 365 data hygiene',
    'clean Dynamics 365 data',
    'improve Dynamics 365 imports',
    'Dynamics 365 data quality',
    'Dynamics CRM import tool',
    'Dynamics 365 CSV cleanup',
    'clean spreadsheet data for Dynamics',
  ],
  openGraph: {
    title: 'Clean Your Dynamics 365 Data Before Import | FreshSegments',
    description:
      'Stop importing messy data into Dynamics 365. FreshSegments validates and cleans your spreadsheets so every import goes right the first time.',
  },
};

export default function DynamicsPage() {
  return <CrmLandingPage crm="dynamics" />;
}
