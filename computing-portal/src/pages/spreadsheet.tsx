import { useState } from 'react';
import Head from 'next/head';
import { FiSave, FiHelpCircle, FiChevronDown, FiRefreshCw } from 'react-icons/fi';
import toast from 'react-hot-toast';
import SimpleSpreadsheet from '@/components/SimpleSpreadsheet';

// Helper to convert column number to letter
const colToLetter = (col: number): string => {
  let letter = '';
  let temp = col;
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
};

// Sample data templates for 7155 syllabus exercises
const spreadsheetTemplates: Array<{ name: string; description: string; data: Record<string, { value: string; formula?: string }> }> = [
  {
    name: 'VLOOKUP Practice',
    description: 'Practice using VLOOKUP for exact matching',
    data: {
      'A1': { value: 'Student ID' },
      'B1': { value: 'Name' },
      'C1': { value: 'Score' },
      'D1': { value: 'Grade' },
      'A2': { value: 'S001' },
      'B2': { value: 'Alice' },
      'C2': { value: '85' },
      'A3': { value: 'S002' },
      'B3': { value: 'Bob' },
      'C3': { value: '72' },
      'A4': { value: 'S003' },
      'B4': { value: 'Charlie' },
      'C4': { value: '91' },
      'F1': { value: 'Min Score' },
      'G1': { value: 'Grade' },
      'F2': { value: '0' },
      'G2': { value: 'F' },
      'F3': { value: '50' },
      'G3': { value: 'D' },
      'F4': { value: '60' },
      'G4': { value: 'C' },
      'F5': { value: '70' },
      'G5': { value: 'B' },
      'F6': { value: '80' },
      'G6': { value: 'A' },
    },
  },
  {
    name: 'Statistical Functions',
    description: 'Practice SUM, AVERAGE, COUNT, MIN, MAX',
    data: {
      'A1': { value: 'Month' },
      'B1': { value: 'Sales' },
      'A2': { value: 'Jan' },
      'B2': { value: '1500' },
      'A3': { value: 'Feb' },
      'B3': { value: '2300' },
      'A4': { value: 'Mar' },
      'B4': { value: '1800' },
      'A5': { value: 'Apr' },
      'B5': { value: '2100' },
      'A6': { value: 'May' },
      'B6': { value: '2800' },
      'A8': { value: 'Total:' },
      'B8': { value: '', formula: '=SUM(B2:B6)' },
      'A9': { value: 'Average:' },
      'B9': { value: '', formula: '=AVERAGE(B2:B6)' },
      'A10': { value: 'Max:' },
      'B10': { value: '', formula: '=MAX(B2:B6)' },
      'A11': { value: 'Min:' },
      'B11': { value: '', formula: '=MIN(B2:B6)' },
      'A12': { value: 'Count:' },
      'B12': { value: '', formula: '=COUNT(B2:B6)' },
    },
  },
  {
    name: 'Simple Calculations',
    description: 'Practice basic formulas and cell references',
    data: {
      'A1': { value: 'Item' },
      'B1': { value: 'Qty' },
      'C1': { value: 'Price' },
      'D1': { value: 'Total' },
      'A2': { value: 'Apples' },
      'B2': { value: '10' },
      'C2': { value: '1.50' },
      'D2': { value: '', formula: '=B2*C2' },
      'A3': { value: 'Oranges' },
      'B3': { value: '8' },
      'C3': { value: '2.00' },
      'D3': { value: '', formula: '=B3*C3' },
      'A4': { value: 'Bananas' },
      'B4': { value: '12' },
      'C4': { value: '0.75' },
      'D4': { value: '', formula: '=B4*C4' },
      'A6': { value: 'Grand Total:' },
      'D6': { value: '', formula: '=SUM(D2:D4)' },
    },
  },
  {
    name: 'Inventory Tracker',
    description: 'Practice conditional logic and calculations',
    data: {
      'A1': { value: 'Product' },
      'B1': { value: 'Category' },
      'C1': { value: 'Price' },
      'D1': { value: 'Stock' },
      'A2': { value: 'Laptop' },
      'B2': { value: 'Electronics' },
      'C2': { value: '1200' },
      'D2': { value: '15' },
      'A3': { value: 'Mouse' },
      'B3': { value: 'Electronics' },
      'C3': { value: '25' },
      'D3': { value: '50' },
      'A4': { value: 'Desk' },
      'B4': { value: 'Furniture' },
      'C4': { value: '300' },
      'D4': { value: '8' },
      'A5': { value: 'Chair' },
      'B5': { value: 'Furniture' },
      'C5': { value: '150' },
      'D5': { value: '20' },
      'A7': { value: 'Total Stock:' },
      'D7': { value: '', formula: '=SUM(D2:D5)' },
      'A8': { value: 'Avg Price:' },
      'C8': { value: '', formula: '=AVERAGE(C2:C5)' },
    },
  },
];

interface CellData {
  value: string;
  formula?: string;
}

type TemplateData = Record<string, CellData>;

export default function SpreadsheetPage() {
  const [sheetData, setSheetData] = useState<TemplateData>({});
  const [showTemplates, setShowTemplates] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const loadTemplate = (template: { name: string; description: string; data: TemplateData }) => {
    setSheetData({ ...template.data });
    setShowTemplates(false);
    toast.success(`Loaded: ${template.name}`);
  };

  const clearSheet = () => {
    setSheetData({});
    toast.success('Sheet cleared');
  };

  const handleSave = async () => {
    try {
      await fetch('/api/spreadsheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'My Spreadsheet',
          data: sheetData,
        }),
      });
      toast.success('Spreadsheet saved!');
    } catch (error) {
      toast.error('Failed to save spreadsheet');
    }
  };

  return (
    <>
      <Head>
        <title>Spreadsheet | Computing 7155 Portal</title>
      </Head>

      <div className="h-[calc(100vh-100px)]">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white">📊 Spreadsheet</h1>
            <p className="text-slate-400 mt-1">
              Practice Excel functions for Module 3
            </p>
          </div>
          <div className="flex items-center space-x-3 mt-4 sm:mt-0">
            {/* Templates Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowTemplates(!showTemplates)}
                className="flex items-center px-4 py-2 bg-slate-700 text-slate-200 rounded-lg hover:bg-slate-600 transition-colors"
              >
                Templates
                <FiChevronDown className="ml-2" />
              </button>
              {showTemplates && (
                <div className="absolute right-0 mt-2 w-72 bg-slate-800 rounded-lg shadow-lg border border-slate-700 z-10">
                  {spreadsheetTemplates.map((template, index) => (
                    <button
                      key={index}
                      onClick={() => loadTemplate(template)}
                      className="w-full text-left px-4 py-3 hover:bg-slate-700 first:rounded-t-lg last:rounded-b-lg transition-colors"
                    >
                      <div className="font-medium text-white">
                        {template.name}
                      </div>
                      <div className="text-sm text-slate-400">
                        {template.description}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Clear Button */}
            <button
              onClick={clearSheet}
              className="flex items-center px-4 py-2 bg-slate-700 text-slate-200 rounded-lg hover:bg-slate-600 transition-colors"
            >
              <FiRefreshCw className="mr-2" />
              Clear
            </button>

            {/* Help Button */}
            <button
              onClick={() => setShowHelp(!showHelp)}
              className="flex items-center px-4 py-2 bg-slate-700 text-slate-200 rounded-lg hover:bg-slate-600 transition-colors"
            >
              <FiHelpCircle className="mr-2" />
              Functions
            </button>

            {/* Save Button */}
            <button
              onClick={handleSave}
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors"
            >
              <FiSave className="mr-2" />
              Save
            </button>
          </div>
        </div>

        {/* Help Panel */}
        {showHelp && (
          <div className="mb-4 bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-4 max-h-60 overflow-y-auto">
            <h3 className="font-semibold text-white mb-3">
              Supported Functions
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div>
                <h4 className="font-medium text-emerald-400 mb-1">Math</h4>
                <p className="text-slate-400">
                  =SUM(A1:A10), Basic math (+, -, *, /)
                </p>
              </div>
              <div>
                <h4 className="font-medium text-blue-400 mb-1">Statistical</h4>
                <p className="text-slate-400">
                  =AVERAGE(A1:A10), =COUNT(A1:A10)
                </p>
              </div>
              <div>
                <h4 className="font-medium text-purple-400 mb-1">Min/Max</h4>
                <p className="text-slate-400">
                  =MIN(A1:A10), =MAX(A1:A10)
                </p>
              </div>
              <div>
                <h4 className="font-medium text-amber-400 mb-1">References</h4>
                <p className="text-slate-400">
                  =A1+B1, =A1*2, Cell references
                </p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-700">
              <p className="text-xs text-slate-500">
                <strong>Tips:</strong> Double-click a cell to edit. Start with = for formulas. Press Enter to confirm, Tab to move right, Escape to cancel.
              </p>
            </div>
          </div>
        )}

        {/* Spreadsheet Container */}
        <div className="h-[calc(100%-120px)] bg-white rounded-xl overflow-hidden shadow-lg">
          <SimpleSpreadsheet
            rows={25}
            cols={12}
            initialData={sheetData}
            onChange={setSheetData}
          />
        </div>
      </div>
    </>
  );
}
