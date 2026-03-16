'use client';

import Link from 'next/link';
import { PublicLayout } from '@/components/PublicLayout';

export interface CrmConfig {
  name: string;
  slug: string;
  headline: string;
  subheadline: string;
  painPoints: {
    title: string;
    description: string;
  }[];
  features: {
    title: string;
    description: string;
    icon: string;
    iconBg: string;
    iconColor: string;
  }[];
  ctaText: string;
}

export const crmConfigs: Record<string, CrmConfig> = {
  hubspot: {
    name: 'HubSpot',
    slug: 'hubspot',
    headline: 'Clean Your Data Before It Hits HubSpot',
    subheadline:
      'Stop spending hours cleaning spreadsheets before every HubSpot import. FreshSegments automatically validates, standardizes, and fixes your data so every import is flawless.',
    painPoints: [
      {
        title: 'Messy HubSpot imports waste hours',
        description:
          'Every bad import means time spent finding and fixing errors inside HubSpot — duplicates, malformed emails, inconsistent naming, missing fields. It adds up fast.',
      },
      {
        title: 'HubSpot data hygiene starts before the import',
        description:
          'The best way to keep your HubSpot database clean is to never let dirty data in. FreshSegments catches problems at the source so your team can trust the CRM.',
      },
      {
        title: 'Spreadsheet cleanup is tedious and error-prone',
        description:
          'Manually scanning rows for bad phone numbers, inconsistent state names, and duplicate contacts is slow work. One missed error can cascade through your workflows and reporting.',
      },
    ],
    features: [
      {
        title: 'HubSpot Property Mapping',
        description:
          'Auto-match your spreadsheet columns to HubSpot properties. FreshSegments remembers your mappings so repeat imports take seconds.',
        icon: 'M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2',
        iconBg: 'bg-green-100',
        iconColor: 'text-green-600',
      },
      {
        title: 'Email & Phone Validation',
        description:
          'Catch invalid emails and malformed phone numbers before they create bad records in HubSpot. Automatically format numbers to E.164.',
        icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
        iconBg: 'bg-blue-100',
        iconColor: 'text-blue-600',
      },
      {
        title: 'Duplicate Detection',
        description:
          'Find duplicate contacts and companies in your spreadsheet before they pollute your HubSpot database. Merge or flag them for review.',
        icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
        iconBg: 'bg-orange-100',
        iconColor: 'text-orange-600',
      },
      {
        title: 'Name & Address Standardization',
        description:
          'Automatically capitalize names, expand state abbreviations, and normalize formatting so your HubSpot data is consistent and professional.',
        icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
        iconBg: 'bg-purple-100',
        iconColor: 'text-purple-600',
      },
    ],
    ctaText: 'Start Cleaning Your HubSpot Data',
  },
  salesforce: {
    name: 'Salesforce',
    slug: 'salesforce',
    headline: 'Clean Your Data Before It Hits Salesforce',
    subheadline:
      'Stop wasting time cleaning spreadsheets before every Salesforce import. FreshSegments validates, standardizes, and fixes your data so every Data Loader import goes smoothly.',
    painPoints: [
      {
        title: 'Bad Salesforce imports cost your team hours',
        description:
          'Every failed Data Loader import means hunting through error logs, fixing rows, and re-importing. Duplicate leads, invalid emails, and inconsistent formatting break your workflows.',
      },
      {
        title: 'Salesforce data quality starts before the import',
        description:
          'Validation rules inside Salesforce reject bad records — but only after you have already spent time preparing the file. FreshSegments catches issues upfront so imports succeed the first time.',
      },
      {
        title: 'Manual spreadsheet cleanup does not scale',
        description:
          'Your ops team should not be spending hours on VLOOKUP deduplication and find-and-replace formatting. Automate the cleanup and free them for higher-value work.',
      },
    ],
    features: [
      {
        title: 'Salesforce Field Mapping',
        description:
          'Map spreadsheet columns to Salesforce fields with smart auto-matching. FreshSegments remembers your mappings for repeat imports.',
        icon: 'M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2',
        iconBg: 'bg-blue-100',
        iconColor: 'text-blue-600',
      },
      {
        title: 'Email & Phone Validation',
        description:
          'Catch invalid emails and malformed phone numbers before they trigger Salesforce validation rule failures. Format numbers consistently.',
        icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
        iconBg: 'bg-green-100',
        iconColor: 'text-green-600',
      },
      {
        title: 'Duplicate Detection',
        description:
          'Identify duplicate leads, contacts, and accounts in your file before import. Avoid the headache of merging records inside Salesforce.',
        icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
        iconBg: 'bg-orange-100',
        iconColor: 'text-orange-600',
      },
      {
        title: 'Name & Address Standardization',
        description:
          'Normalize names, state abbreviations, and data formats automatically. Keep your Salesforce org clean and consistent from the start.',
        icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
        iconBg: 'bg-purple-100',
        iconColor: 'text-purple-600',
      },
    ],
    ctaText: 'Start Cleaning Your Salesforce Data',
  },
  dynamics: {
    name: 'Dynamics 365',
    slug: 'dynamics',
    headline: 'Clean Your Data Before It Hits Dynamics 365',
    subheadline:
      'Stop fighting with messy spreadsheets before every Dynamics 365 import. FreshSegments validates and standardizes your data so imports go right the first time.',
    painPoints: [
      {
        title: 'Dynamics 365 imports fail on dirty data',
        description:
          'Incorrect formats, missing required fields, and duplicate records cause import errors that send your team back to the spreadsheet for another round of cleanup.',
      },
      {
        title: 'Data quality in Dynamics starts at the source',
        description:
          'Cleaning data after it reaches Dynamics means working around complex entity relationships. It is far easier — and safer — to fix problems before import.',
      },
      {
        title: 'Spreadsheet cleanup should not be manual',
        description:
          'Scanning thousands of rows for formatting issues, bad emails, and inconsistent data is tedious. Automate it and spend your time on work that matters.',
      },
    ],
    features: [
      {
        title: 'Dynamics 365 Field Mapping',
        description:
          'Map your columns to Dynamics 365 entity fields with smart auto-matching. Saved mappings make repeat imports effortless.',
        icon: 'M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2',
        iconBg: 'bg-blue-100',
        iconColor: 'text-blue-600',
      },
      {
        title: 'Email & Phone Validation',
        description:
          'Validate email addresses and standardize phone numbers before they create incomplete records in Dynamics 365.',
        icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
        iconBg: 'bg-green-100',
        iconColor: 'text-green-600',
      },
      {
        title: 'Duplicate Detection',
        description:
          'Catch duplicates in your spreadsheet before they create merge headaches in Dynamics 365. Flag or remove them during validation.',
        icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
        iconBg: 'bg-orange-100',
        iconColor: 'text-orange-600',
      },
      {
        title: 'Name & Address Standardization',
        description:
          'Automatically format names, normalize addresses, and standardize data so your Dynamics 365 records are clean from day one.',
        icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
        iconBg: 'bg-purple-100',
        iconColor: 'text-purple-600',
      },
    ],
    ctaText: 'Start Cleaning Your Dynamics 365 Data',
  },
  pipedrive: {
    name: 'Pipedrive',
    slug: 'pipedrive',
    headline: 'Clean Your Data Before It Hits Pipedrive',
    subheadline:
      'Stop importing messy spreadsheets into Pipedrive. FreshSegments validates and cleans your data automatically so your pipeline stays accurate and your team can sell.',
    painPoints: [
      {
        title: 'Dirty data clutters your Pipedrive pipeline',
        description:
          'Duplicate contacts, misspelled names, and invalid emails create noise in your pipeline. Your reps waste time sorting through bad data instead of closing deals.',
      },
      {
        title: 'Pipedrive data quality starts before the import',
        description:
          'Cleaning up records after they are already in Pipedrive means touching deals, contacts, and organizations one by one. Catch problems before they reach your pipeline.',
      },
      {
        title: 'Manual spreadsheet cleanup slows down your team',
        description:
          'Every hour your sales ops team spends formatting spreadsheets is an hour they are not improving your sales process. Automate the grunt work.',
      },
    ],
    features: [
      {
        title: 'Pipedrive Field Mapping',
        description:
          'Map spreadsheet columns to Pipedrive fields with intelligent auto-matching. Saved mappings make future imports instant.',
        icon: 'M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2',
        iconBg: 'bg-green-100',
        iconColor: 'text-green-600',
      },
      {
        title: 'Email & Phone Validation',
        description:
          'Validate every email address and phone number before import. No more bounced outreach from bad contact data in Pipedrive.',
        icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
        iconBg: 'bg-blue-100',
        iconColor: 'text-blue-600',
      },
      {
        title: 'Duplicate Detection',
        description:
          'Spot duplicate people and organizations in your file before they clutter your Pipedrive account. Merge or remove them upfront.',
        icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
        iconBg: 'bg-orange-100',
        iconColor: 'text-orange-600',
      },
      {
        title: 'Name & Address Standardization',
        description:
          'Auto-format names, normalize addresses, and clean up inconsistent data so your Pipedrive records look professional.',
        icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
        iconBg: 'bg-purple-100',
        iconColor: 'text-purple-600',
      },
    ],
    ctaText: 'Start Cleaning Your Pipedrive Data',
  },
  'zoho-crm': {
    name: 'Zoho CRM',
    slug: 'zoho-crm',
    headline: 'Clean Your Data Before It Hits Zoho CRM',
    subheadline:
      'Stop importing messy spreadsheets into Zoho CRM. FreshSegments validates, standardizes, and fixes your data so every import is clean and your CRM stays reliable.',
    painPoints: [
      {
        title: 'Bad imports pollute your Zoho CRM database',
        description:
          'Duplicate leads, invalid emails, and inconsistent formatting create noise across your modules. Your team wastes time on data cleanup instead of selling.',
      },
      {
        title: 'Zoho CRM data hygiene starts before the import',
        description:
          'Fixing records inside Zoho CRM means navigating modules and updating fields one at a time. It is far faster to clean the spreadsheet before it ever reaches your CRM.',
      },
      {
        title: 'Spreadsheet cleanup is a bottleneck',
        description:
          'Your team should not be spending hours on manual data formatting. Automate the tedious work and get clean data into Zoho CRM in minutes.',
      },
    ],
    features: [
      {
        title: 'Zoho CRM Field Mapping',
        description:
          'Map spreadsheet columns to Zoho CRM module fields with auto-matching. Save your mappings for one-click repeat imports.',
        icon: 'M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2',
        iconBg: 'bg-green-100',
        iconColor: 'text-green-600',
      },
      {
        title: 'Email & Phone Validation',
        description:
          'Validate emails and phone numbers before they reach Zoho CRM. Keep your lead and contact modules free of bad data.',
        icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
        iconBg: 'bg-blue-100',
        iconColor: 'text-blue-600',
      },
      {
        title: 'Duplicate Detection',
        description:
          'Find and flag duplicates in your spreadsheet before they create redundant records across your Zoho CRM modules.',
        icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
        iconBg: 'bg-orange-100',
        iconColor: 'text-orange-600',
      },
      {
        title: 'Name & Address Standardization',
        description:
          'Automatically capitalize names, normalize state abbreviations, and clean formatting so your Zoho CRM data is consistent.',
        icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
        iconBg: 'bg-purple-100',
        iconColor: 'text-purple-600',
      },
    ],
    ctaText: 'Start Cleaning Your Zoho CRM Data',
  },
  monday: {
    name: 'monday.com',
    slug: 'monday',
    headline: 'Clean Your Data Before It Hits monday.com',
    subheadline:
      'Stop importing messy spreadsheets into monday.com. FreshSegments validates and cleans your data automatically so your boards stay organized and your team stays productive.',
    painPoints: [
      {
        title: 'Dirty data creates chaos in your monday.com boards',
        description:
          'Inconsistent names, duplicate entries, and bad contact info clutter your boards and make it harder for your team to find what they need.',
      },
      {
        title: 'Data quality starts before the import',
        description:
          'Cleaning up items inside monday.com means editing rows one by one or running complex automations. It is much faster to clean the data before import.',
      },
      {
        title: 'Stop wasting time on manual spreadsheet cleanup',
        description:
          'Every import that requires manual formatting is time your team could spend on actual work. Automate the cleanup and import with confidence.',
      },
    ],
    features: [
      {
        title: 'monday.com Column Mapping',
        description:
          'Map your spreadsheet columns to monday.com board columns with smart auto-matching. Save mappings for future imports.',
        icon: 'M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2',
        iconBg: 'bg-blue-100',
        iconColor: 'text-blue-600',
      },
      {
        title: 'Email & Phone Validation',
        description:
          'Validate email addresses and phone numbers before they create incomplete items in your monday.com boards.',
        icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
        iconBg: 'bg-green-100',
        iconColor: 'text-green-600',
      },
      {
        title: 'Duplicate Detection',
        description:
          'Spot duplicate entries in your file before they create redundant items in monday.com. Keep your boards clean from the start.',
        icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
        iconBg: 'bg-orange-100',
        iconColor: 'text-orange-600',
      },
      {
        title: 'Name & Address Standardization',
        description:
          'Automatically format names, normalize addresses, and standardize your data so monday.com items are consistent and searchable.',
        icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
        iconBg: 'bg-purple-100',
        iconColor: 'text-purple-600',
      },
    ],
    ctaText: 'Start Cleaning Your monday.com Data',
  },
  airtable: {
    name: 'Airtable',
    slug: 'airtable',
    headline: 'Clean Your Data Before It Hits Airtable',
    subheadline:
      'Stop importing messy spreadsheets into Airtable. FreshSegments validates, standardizes, and cleans your data so your bases stay organized and reliable.',
    painPoints: [
      {
        title: 'Messy imports break your Airtable workflows',
        description:
          'Bad data in your bases cascades into views, automations, and linked records. Duplicate entries and inconsistent formatting make your Airtable workspace unreliable.',
      },
      {
        title: 'Airtable data quality starts before the import',
        description:
          'Fixing records inside Airtable means editing rows individually or building complex formulas. Clean the data before it arrives and skip the hassle.',
      },
      {
        title: 'Manual spreadsheet cleanup does not scale',
        description:
          'As your data grows, manual formatting and deduplication become unsustainable. Automate your data cleaning and import clean records every time.',
      },
    ],
    features: [
      {
        title: 'Airtable Field Mapping',
        description:
          'Map your spreadsheet columns to Airtable fields with auto-matching. Saved mappings make repeat imports a breeze.',
        icon: 'M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2',
        iconBg: 'bg-yellow-100',
        iconColor: 'text-yellow-600',
      },
      {
        title: 'Email & Phone Validation',
        description:
          'Validate emails and phone numbers so your Airtable records are accurate from the start. No more broken automations from bad data.',
        icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
        iconBg: 'bg-blue-100',
        iconColor: 'text-blue-600',
      },
      {
        title: 'Duplicate Detection',
        description:
          'Find duplicates before they reach your Airtable base. Keep your tables clean and your linked records accurate.',
        icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
        iconBg: 'bg-orange-100',
        iconColor: 'text-orange-600',
      },
      {
        title: 'Name & Address Standardization',
        description:
          'Automatically capitalize names, normalize state abbreviations, and fix formatting inconsistencies before importing into Airtable.',
        icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
        iconBg: 'bg-purple-100',
        iconColor: 'text-purple-600',
      },
    ],
    ctaText: 'Start Cleaning Your Airtable Data',
  },
};

export function CrmLandingPage({ crm }: { crm: string }) {
  const config = crmConfigs[crm];
  if (!config) return null;

  return (
    <PublicLayout maxWidth="max-w-6xl">
      {/* Hero Section */}
      <section className="text-center pt-8 pb-16">
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 tracking-tight">
          {config.headline.split(config.name).map((part, i, arr) =>
            i < arr.length - 1 ? (
              <span key={i}>
                {part}
                <span style={{ color: '#0B8377' }}>{config.name}</span>
              </span>
            ) : (
              <span key={i}>{part}</span>
            )
          )}
        </h1>
        <p className="mt-6 text-xl text-gray-600 max-w-3xl mx-auto">
          {config.subheadline}
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/signup"
            className="px-8 py-4 text-white rounded-xl font-semibold text-lg transition-colors hover:opacity-90"
            style={{ backgroundColor: '#0B8377' }}
          >
            Start Free Trial
          </Link>
        </div>
        <p className="mt-4 text-sm text-gray-500">
          $19.99/month after 14-day free trial. Cancel anytime.
        </p>
      </section>

      {/* HubSpot Integration Banner */}
      {crm === 'hubspot' && (
        <div className="mb-8 rounded-xl border-2 border-teal-200 bg-gradient-to-r from-teal-50 to-emerald-50 p-6 sm:p-8 text-center">
          <span className="inline-block px-3 py-1 text-xs font-bold uppercase tracking-wider text-white rounded-full mb-3" style={{ backgroundColor: '#0B8377' }}>
            New
          </span>
          <h2 className="text-2xl font-bold text-gray-900">Now Integrates with HubSpot</h2>
          <p className="mt-3 text-gray-600 max-w-2xl mx-auto">
            FreshSegments now pulls in all properties for Contacts, Companies, and Deals automatically from your HubSpot account — making it easier than ever to update your spreadsheet column headings to match your CRM.
          </p>
        </div>
      )}

      {/* Pain Points */}
      <section className="py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900">
            Stop Spending Time Cleaning Spreadsheets
          </h2>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            Every hour spent on manual data cleanup is an hour wasted. FreshSegments automates the work so your {config.name} data is always import-ready.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {config.painPoints.map((point) => (
            <div key={point.title} className="bg-white rounded-2xl p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">{point.title}</h3>
              <p className="text-gray-600 leading-relaxed">{point.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900">
            Everything You Need for Clean {config.name} Data
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Powerful validation and transformation tools built for {config.name} imports.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {config.features.map((feature) => (
            <div key={feature.title} className="bg-white rounded-2xl p-6 border border-gray-200">
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 ${feature.iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                  <svg className={`w-6 h-6 ${feature.iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={feature.icon} />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900">How It Works</h2>
          <p className="mt-4 text-lg text-gray-600">Three steps to clean {config.name} data.</p>
        </div>

        <div className="max-w-3xl mx-auto space-y-8">
          <div className="flex items-start gap-6">
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold" style={{ backgroundColor: '#0B8377' }}>1</div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Upload Your Spreadsheet</h3>
              <p className="mt-2 text-gray-600">Drag and drop your CSV or Excel file. Your data is parsed in your browser and never uploaded to our servers.</p>
            </div>
          </div>

          <div className="flex items-start gap-6">
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold" style={{ backgroundColor: '#0B8377' }}>2</div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Review & Fix Issues</h3>
              <p className="mt-2 text-gray-600">FreshSegments automatically cleans your data and flags anything that needs your attention. See every change before you export.</p>
            </div>
          </div>

          <div className="flex items-start gap-6">
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold" style={{ backgroundColor: '#0B8377' }}>3</div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Import into {config.name}</h3>
              <p className="mt-2 text-gray-600">Download your validated, {config.name}-ready file and import it with confidence. No more errors, no more cleanup.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="bg-gradient-to-br from-teal-50 to-white rounded-3xl p-8 sm:p-12 border-2 border-teal-200 text-center">
          <h2 className="text-3xl font-bold text-gray-900">{config.ctaText}</h2>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            Join teams who trust FreshSegments to clean their data before every {config.name} import. Start your 14-day free trial today.
          </p>
          <div className="mt-8">
            <Link
              href="/signup"
              className="inline-block px-8 py-4 text-white rounded-xl font-semibold text-lg transition-colors hover:opacity-90"
              style={{ backgroundColor: '#0B8377' }}
            >
              Start Free Trial
            </Link>
            <p className="mt-4 text-sm text-gray-500">$19.99/month after trial. Cancel anytime.</p>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
