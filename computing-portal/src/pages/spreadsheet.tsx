import { useState, useRef, useEffect } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import { FiSave, FiHelpCircle, FiChevronDown, FiRefreshCw } from 'react-icons/fi';
import toast from 'react-hot-toast';

// Sample data templates for 7155 syllabus exercises
const spreadsheetTemplates = [
  {
    name: 'VLOOKUP Practice',
    description: 'Practice using VLOOKUP for exact matching',
    data: [
      ['Student ID', 'Name', 'Score', 'Grade', '', 'Min Score', 'Grade'],
      ['S001', 'Alice', 85, '', '', 0, 'F'],
      ['S002', 'Bob', 72, '', '', 50, 'D'],
      ['S003', 'Charlie', 91, '', '', 60, 'C'],
      ['', '', '', '', '', 70, 'B'],
      ['', '', '', '', '', 80, 'A'],
    ],
  },
  {
    name: 'Statistical Functions',
    description: 'Practice SUM, AVERAGE, COUNT, MIN, MAX',
    data: [
      ['Month', 'Sales'],
      ['Jan', 1500],
      ['Feb', 2300],
      ['Mar', 1800],
      ['Apr', 2100],
      ['May', 2800],
      ['', ''],
      ['Total:', '=SUM(B2:B6)'],
      ['Average:', '=AVERAGE(B2:B6)'],
      ['Max:', '=MAX(B2:B6)'],
      ['Min:', '=MIN(B2:B6)'],
      ['Count:', '=COUNT(B2:B6)'],
    ],
  },
  {
    name: 'Simple Calculations',
    description: 'Practice basic formulas and cell references',
    data: [
      ['Item', 'Qty', 'Price', 'Total'],
      ['Apples', 10, 1.50, '=B2*C2'],
      ['Oranges', 8, 2.00, '=B3*C3'],
      ['Bananas', 12, 0.75, '=B4*C4'],
      ['', '', '', ''],
      ['Grand Total:', '', '', '=SUM(D2:D4)'],
    ],
  },
  {
    name: 'Inventory Tracker',
    description: 'Practice conditional logic and calculations',
    data: [
      ['Product', 'Category', 'Price', 'Stock'],
      ['Laptop', 'Electronics', 1200, 15],
      ['Mouse', 'Electronics', 25, 50],
      ['Desk', 'Furniture', 300, 8],
      ['Chair', 'Furniture', 150, 20],
      ['', '', '', ''],
      ['Total Stock:', '', '', '=SUM(D2:D5)'],
      ['Avg Price:', '', '=AVERAGE(C2:C5)', ''],
    ],
  },
];

// Create empty data grid
const createEmptyData = (rows: number, cols: number) => {
  return Array(rows).fill(null).map(() => Array(cols).fill(''));
};

// Spreadsheet component that loads jspreadsheet dynamically
function SpreadsheetComponent({ 
  initialData,
  onDataChange 
}: { 
  initialData: (string | number)[][];
  onDataChange?: (data: (string | number)[][]) => void;
}) {
  const jspreadsheetRef = useRef<HTMLDivElement>(null);
  const spreadsheetInstance = useRef<any>(null);

  useEffect(() => {
    // Dynamic import to avoid SSR issues
    const initSpreadsheet = async () => {
      if (typeof window === 'undefined' || !jspreadsheetRef.current) return;

      // Import jspreadsheet and its CSS
      const jspreadsheetModule = await import('jspreadsheet-ce');
      const jspreadsheet = jspreadsheetModule.default;
      
      // Import CSS dynamically
      if (!document.querySelector('link[href*="jspreadsheet"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://bossanova.uk/jspreadsheet/v4/jexcel.css';
        document.head.appendChild(link);
        
        const jsuites = document.createElement('link');
        jsuites.rel = 'stylesheet';
        jsuites.href = 'https://jsuites.net/v4/jsuites.css';
        document.head.appendChild(jsuites);
      }

      // Destroy existing instance if any
      if (spreadsheetInstance.current) {
        try {
          jspreadsheet.destroy(jspreadsheetRef.current as any);
        } catch (e) {
          // Ignore destruction errors
        }
      }

      // Clear the container
      if (jspreadsheetRef.current) {
        jspreadsheetRef.current.innerHTML = '';
      }

      // Create column config (A-Z columns)
      const columns = Array(26).fill(null).map((_, i) => ({
        title: String.fromCharCode(65 + i),
        width: 100,
      }));

      // Initialize jspreadsheet
      spreadsheetInstance.current = jspreadsheet(jspreadsheetRef.current as any, {
        data: initialData.length > 0 ? initialData : createEmptyData(50, 26),
        columns,
        minDimensions: [26, 50],
        tableOverflow: true,
        tableWidth: '100%',
        tableHeight: '100%',
        allowInsertRow: true,
        allowInsertColumn: true,
        allowDeleteRow: true,
        allowDeleteColumn: true,
        allowRenameColumn: true,
        allowComments: true,
        columnSorting: true,
        columnDrag: true,
        columnResize: true,
        rowResize: true,
        rowDrag: true,
        selectionCopy: true,
        search: true,
        parseFormulas: true,
        autoIncrement: true,
        about: false,
        onchange: () => {
          if (onDataChange && spreadsheetInstance.current) {
            const data = spreadsheetInstance.current.getData();
            onDataChange(data);
          }
        },
        contextMenu: function(obj: any, x: any, y: any, e: any) {
          const items: any[] = [];
          const colIdx = typeof x === 'number' ? x : parseInt(x) || 0;
          const rowIdx = typeof y === 'number' ? y : parseInt(y) || 0;
          
          // Insert row options
          items.push({
            title: 'Insert row above',
            onclick: function() {
              obj.insertRow(1, rowIdx, true);
            }
          });
          items.push({
            title: 'Insert row below',
            onclick: function() {
              obj.insertRow(1, rowIdx, false);
            }
          });
          
          // Insert column options
          items.push({
            title: 'Insert column left',
            onclick: function() {
              obj.insertColumn(1, colIdx, true);
            }
          });
          items.push({
            title: 'Insert column right',
            onclick: function() {
              obj.insertColumn(1, colIdx, false);
            }
          });
          
          items.push({ type: 'line' });
          
          // Delete options
          items.push({
            title: 'Delete row',
            onclick: function() {
              obj.deleteRow(rowIdx, 1);
            }
          });
          items.push({
            title: 'Delete column',
            onclick: function() {
              obj.deleteColumn(colIdx, 1);
            }
          });
          
          return items;
        },
        style: {
          A1: 'font-weight: bold;',
        },
      } as any);
    };

    initSpreadsheet();

    return () => {
      // Cleanup on unmount
      if (spreadsheetInstance.current && jspreadsheetRef.current) {
        try {
          import('jspreadsheet-ce').then(mod => {
            mod.default.destroy(jspreadsheetRef.current as any);
          });
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    };
  }, [initialData, onDataChange]);

  return (
    <div 
      ref={jspreadsheetRef} 
      className="jspreadsheet-container"
      style={{ width: '100%', height: '100%', overflow: 'auto' }}
    />
  );
}

// Dynamically import the component to avoid SSR issues
const DynamicSpreadsheet = dynamic(
  () => Promise.resolve(SpreadsheetComponent),
  { ssr: false }
);

export default function SpreadsheetPage() {
  const [sheetData, setSheetData] = useState<(string | number)[][]>(createEmptyData(50, 26));
  const [showTemplates, setShowTemplates] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [key, setKey] = useState(0); // Force re-render when loading templates

  const loadTemplate = (template: typeof spreadsheetTemplates[0]) => {
    // Pad template data to minimum dimensions
    const paddedData = [...template.data];
    while (paddedData.length < 50) {
      paddedData.push(Array(26).fill(''));
    }
    // Ensure each row has 26 columns
    const normalizedData = paddedData.map(row => {
      const newRow = [...row];
      while (newRow.length < 26) {
        newRow.push('');
      }
      return newRow;
    });
    
    setSheetData(normalizedData);
    setKey(prev => prev + 1); // Force re-render
    setShowTemplates(false);
    toast.success(`Loaded: ${template.name}`);
  };

  const clearSheet = () => {
    setSheetData(createEmptyData(50, 26));
    setKey(prev => prev + 1); // Force re-render
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

      <style jsx global>{`
        .jspreadsheet-container {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .jexcel {
          border: none !important;
        }
        .jexcel_content {
          background: white;
        }
        .jexcel td {
          border-color: #e2e8f0 !important;
        }
        .jexcel thead td {
          background: #f1f5f9 !important;
          color: #475569 !important;
          font-weight: 600 !important;
        }
        .jexcel tbody tr:first-child td {
          font-weight: 500;
        }
        .jexcel td.highlight {
          background: #dbeafe !important;
        }
        .jexcel td.highlight-left {
          border-left: 2px solid #3b82f6 !important;
        }
        .jexcel td.highlight-right {
          border-right: 2px solid #3b82f6 !important;
        }
        .jexcel td.highlight-top {
          border-top: 2px solid #3b82f6 !important;
        }
        .jexcel td.highlight-bottom {
          border-bottom: 2px solid #3b82f6 !important;
        }
        .jexcel_toolbar {
          background: #f8fafc !important;
          border-bottom: 1px solid #e2e8f0 !important;
        }
        .jexcel > thead > tr > td {
          padding: 8px 4px !important;
        }
        .jexcel > tbody > tr > td {
          padding: 6px 8px !important;
        }
        .jexcel_container {
          box-shadow: none !important;
        }
        .jexcel_pagination {
          background: #f8fafc !important;
        }
        .jexcel_search {
          background: white !important;
          border: 1px solid #e2e8f0 !important;
          border-radius: 4px !important;
        }
        .jcontextmenu {
          background: #1e293b !important;
          border: 1px solid #334155 !important;
          border-radius: 8px !important;
          box-shadow: 0 10px 25px rgba(0,0,0,0.3) !important;
        }
        .jcontextmenu > div {
          color: #e2e8f0 !important;
          padding: 8px 16px !important;
        }
        .jcontextmenu > div:hover {
          background: #334155 !important;
        }
        .jcontextmenu hr {
          border-color: #475569 !important;
        }
      `}</style>

      <div className="h-[calc(100vh-100px)]">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white">📊 Spreadsheet</h1>
            <p className="text-slate-400 mt-1">
              Practice Excel functions for Module 3 - Full spreadsheet with formulas
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
                <div className="absolute right-0 mt-2 w-72 bg-slate-800 rounded-lg shadow-xl border border-slate-700 z-50">
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
              Available Functions & Features
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div>
                <h4 className="font-medium text-emerald-400 mb-1">Math Functions</h4>
                <p className="text-slate-400">
                  =SUM(A1:A10), =ROUND(A1,2), Basic math (+, -, *, /)
                </p>
              </div>
              <div>
                <h4 className="font-medium text-blue-400 mb-1">Statistical</h4>
                <p className="text-slate-400">
                  =AVERAGE(), =COUNT(), =COUNTA(), =COUNTIF()
                </p>
              </div>
              <div>
                <h4 className="font-medium text-purple-400 mb-1">Min/Max</h4>
                <p className="text-slate-400">
                  =MIN(), =MAX(), =LARGE(), =SMALL()
                </p>
              </div>
              <div>
                <h4 className="font-medium text-amber-400 mb-1">Logic</h4>
                <p className="text-slate-400">
                  =IF(), =AND(), =OR(), =NOT()
                </p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-700">
              <p className="text-xs text-slate-500">
                <strong>Features:</strong> Click to select • Double-click to edit • Drag to select range • Right-click for context menu • Ctrl+C/V for copy/paste • Drag cell corner to fill
              </p>
            </div>
          </div>
        )}

        {/* Spreadsheet Container */}
        <div className="h-[calc(100%-120px)] bg-white rounded-xl overflow-hidden shadow-lg">
          <DynamicSpreadsheet 
            key={key}
            initialData={sheetData}
            onDataChange={setSheetData}
          />
        </div>
      </div>
    </>
  );
}
