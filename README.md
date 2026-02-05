# List Validator

A web application to validate lists, alert users of issues, and sync data to HubSpot.

## Features

### 1. File Upload
- Accepts CSV, XLS, and XLSX formats
- Drag and drop interface
- File parsing with progress indicator

### 2. Header Mapping with Fuzzy Matching
- Automatic header detection using fuzzy matching
- Configurable field mappings with variants
- Support for custom field mappings
- Required field configuration

### 3. Data Validation
- Required field validation
- Email format validation
- Phone format validation
- Duplicate detection
- Clear error/warning reporting

### 4. Data Enrichment
- SERP API integration for finding:
  - Official company names
  - Company domains
- Configurable enrichment rules
- Support for multiple data sources

### 5. HubSpot Integration
- Search existing companies by domain
- Fuzzy company name matching
- Automatic company creation when no match found
- Contact creation/update with company association
- Task creation for new companies
- Configurable task assignee

### 6. Final Audit & Export
- Flag uncertain matches for review
- Data quality checks (personal emails, uppercase names, etc.)
- Export clean data in HubSpot-ready format
- Export flagged data for manual review
- CSV and Excel export options

### 7. Logging
- Timestamped activity logging
- Error tracking for audit
- Export logs as JSON/CSV

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Database**: Supabase (PostgreSQL)
- **File Parsing**: Papa Parse (CSV), SheetJS (Excel)
- **Fuzzy Matching**: Fuse.js
- **HubSpot API**: @hubspot/api-client

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- HubSpot account with Private App access token
- SERP API key (for data enrichment)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/bradsommer/list-validator.git
cd list-validator
```

2. Install dependencies:
```bash
npm install
```

3. Copy the environment example file:
```bash
cp .env.example .env.local
```

4. Configure your environment variables in `.env.local`:
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# HubSpot Configuration
HUBSPOT_ACCESS_TOKEN=your_hubspot_access_token
HUBSPOT_PORTAL_ID=your_hubspot_portal_id

# SERP API Configuration
SERP_API_KEY=your_serp_api_key
```

5. Set up the Supabase database:
   - Go to your Supabase project
   - Open the SQL Editor
   - Run the contents of `supabase/schema.sql`

6. Start the development server:
```bash
npm run dev
```

7. Open [http://localhost:3000](http://localhost:3000)

## Usage

1. **Upload**: Drag and drop or click to upload your CSV/Excel file
2. **Map Fields**: Review and adjust the automatic header mapping
3. **Validate**: Review validation errors and warnings
4. **Enrich**: Run data enrichment to find company names/domains
5. **HubSpot Sync**: Sync contacts to HubSpot and match/create companies
6. **Audit & Export**: Review flagged items and export clean data

## Configuration

### Field Mappings

Default mappings can be modified in the Settings page (`/settings`). Each mapping includes:
- **HubSpot Field**: The internal HubSpot field name
- **Display Label**: Human-readable label
- **Variants**: Alternative column names that should match

### Enrichment Rules

Configure enrichment rules to automatically find:
- Official company names
- Company domains
- Custom data points

### HubSpot Settings

- **Default Task Assignee**: Owner ID for tasks created with new companies
- **Notify on New Company**: List of owner IDs to notify

## Project Structure

```
src/
├── app/                    # Next.js app router pages
│   ├── api/               # API routes
│   │   ├── enrichment/    # Enrichment API
│   │   └── hubspot/       # HubSpot API
│   ├── settings/          # Settings page
│   └── page.tsx           # Main app page
├── components/            # React components
│   ├── audit/            # Audit review components
│   ├── enrichment/       # Enrichment panel
│   ├── hubspot/          # HubSpot sync
│   ├── layout/           # Layout components
│   ├── mapping/          # Header mapping
│   ├── upload/           # File upload
│   └── validation/       # Validation results
├── lib/                   # Utility libraries
│   ├── audit.ts          # Audit logic
│   ├── enrichment.ts     # Enrichment logic
│   ├── fileParser.ts     # File parsing
│   ├── fuzzyMatcher.ts   # Fuzzy matching
│   ├── hubspot.ts        # HubSpot API
│   ├── logger.ts         # Logging
│   ├── supabase.ts       # Supabase client
│   └── validator.ts      # Validation logic
├── store/                 # Zustand store
│   └── useAppStore.ts    # Main app store
└── types/                 # TypeScript types
    └── index.ts          # Type definitions
```

## API Endpoints

### POST /api/hubspot/sync
Sync contacts to HubSpot. Streams progress updates.

### GET /api/hubspot/owners
Get list of HubSpot owners for task assignment.

### POST /api/enrichment
Run enrichment on a single row of data.

## License

MIT
