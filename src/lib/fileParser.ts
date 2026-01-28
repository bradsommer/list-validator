import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { ParsedFile, ParsedRow } from '@/types';

export async function parseFile(file: File): Promise<ParsedFile> {
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith('.csv')) {
    return parseCSV(file);
  } else if (fileName.endsWith('.xls') || fileName.endsWith('.xlsx')) {
    return parseExcel(file);
  } else {
    throw new Error('Unsupported file format. Please upload a CSV, XLS, or XLSX file.');
  }
}

async function parseCSV(file: File): Promise<ParsedFile> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
      complete: (results) => {
        const headers = results.meta.fields || [];
        const rows = results.data as ParsedRow[];

        resolve({
          headers,
          rows,
          fileName: file.name,
          totalRows: rows.length,
        });
      },
      error: (error) => {
        reject(new Error(`CSV parsing error: ${error.message}`));
      },
    });
  });
}

async function parseExcel(file: File): Promise<ParsedFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });

        // Get the first sheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Convert to JSON with headers
        const jsonData = XLSX.utils.sheet_to_json<ParsedRow>(worksheet, {
          defval: '', // Default value for empty cells
        });

        // Extract headers from the first row keys
        const headers = jsonData.length > 0 ? Object.keys(jsonData[0]) : [];

        resolve({
          headers,
          rows: jsonData,
          fileName: file.name,
          totalRows: jsonData.length,
        });
      } catch (error) {
        reject(new Error(`Excel parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read the file.'));
    };

    reader.readAsBinaryString(file);
  });
}

export function exportToCSV(data: ParsedRow[], fileName: string): void {
  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportToExcel(data: ParsedRow[], fileName: string): void {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  XLSX.writeFile(workbook, fileName);
}
