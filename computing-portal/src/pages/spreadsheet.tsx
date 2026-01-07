import { useState, useCallback, useMemo } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import { FiSave, FiHelpCircle, FiChevronDown, FiRefreshCw } from 'react-icons/fi';
import toast from 'react-hot-toast';

// Dynamically import react-spreadsheet to avoid SSR issues
const Spreadsheet = dynamic(() => import('react-spreadsheet'), { ssr: false });

// Types for react-spreadsheet
interface CellBase {
  value: string | number;
  readOnly?: boolean;
  className?: string;
}

type Matrix = (CellBase | undefined)[][];

// Sample data templates for 7155 syllabus exercises
const spreadsheetTemplates: { name: string; description: string; data: Matrix }[] = [
  {
    name: 'VLOOKUP Practice',
    description: 'Practice using VLOOKUP for exact matching',
    data: [
      [{ value: 'Student ID' }, { value: 'Name' }, { value: 'Score' }, { value: 'Grade' }, undefined, { value: 'Min Score' }, { value: 'Grade' }],
      [{ value: 'S001' }, { value: 'Alice' }, { value: 85 }, undefined, undefined, { value: 0 }, { value: 'F' }],
      [{ value: 'S002' }, { value: 'Bob' }, { value: 72 }, undefined, undefined, { value: 50 }, { value: 'D' }],
      [{ value: 'S003' }, { value: 'Charlie' }, { value: 91 }, undefined, undefined, { value: 60 }, { value: 'C' }],
      [undefined, undefined, undefined, undefined, undefined, { value: 70 }, { value: 'B' }],
      [undefined, undefined, undefined, undefined, undefined, { value: 80 }, { value: 'A' }],
    ],
  },
  {
    name: 'Statistical Functions',
    description: 'Practice SUM, AVERAGE, COUNT, MIN, MAX',
    data: [
      [{ value: 'Month' }, { value: 'Sales' }],
      [{ value: 'Jan' }, { value: 1500 }],
      [{ value: 'Feb' }, { value: 2300 }],
      [{ value: 'Mar' }, { value: 1800 }],
      [{ value: 'Apr' }, { value: 2100 }],
      [{ value: 'May' }, { value: 2800 }],
      [undefined, undefined],
      [{ value: 'Total:' }, { value: '=SUM(B2:B6)' }],
      [{ value: 'Average:' }, { value: '=AVERAGE(B2:B6)' }],
      [{ value: 'Max:' }, { value: '=MAX(B2:B6)' }],
      [{ value: 'Min:' }, { value: '=MIN(B2:B6)' }],
      [{ value: 'Count:' }, { value: '=COUNT(B2:B6)' }],
    ],
  },
  {
    name: 'Simple Calculations',
    description: 'Practice basic formulas and cell references',
    data: [
      [{ value: 'Item' }, { value: 'Qty' }, { value: 'Price' }, { value: 'Total' }],
      [{ value: 'Apples' }, { value: 10 }, { value: 1.50 }, { value: '=B2*C2' }],
      [{ value: 'Oranges' }, { value: 8 }, { value: 2.00 }, { value: '=B3*C3' }],
      [{ value: 'Bananas' }, { value: 12 }, { value: 0.75 }, { value: '=B4*C4' }],
      [undefined, undefined, undefined, undefined],
      [{ value: 'Grand Total:' }, undefined, undefined, { value: '=SUM(D2:D4)' }],
    ],
  },
  {
    name: 'Inventory Tracker',
    description: 'Practice conditional logic and calculations',
    data: [
      [{ value: 'Product' }, { value: 'Category' }, { value: 'Price' }, { value: 'Stock' }],
      [{ value: 'Laptop' }, { value: 'Electronics' }, { value: 1200 }, { value: 15 }],
      [{ value: 'Mouse' }, { value: 'Electronics' }, { value: 25 }, { value: 50 }],
      [{ value: 'Desk' }, { value: 'Furniture' }, { value: 300 }, { value: 8 }],
      [{ value: 'Chair' }, { value: 'Furniture' }, { value: 150 }, { value: 20 }],
      [undefined, undefined, undefined, undefined],
      [{ value: 'Total Stock:' }, undefined, undefined, { value: '=SUM(D2:D5)' }],
      [{ value: 'Avg Price:' }, undefined, { value: '=AVERAGE(C2:C5)' }, undefined],
    ],
  },
];

// Create empty data grid
const createEmptyData = (rows: number, cols: number): Matrix => {
  return Array(rows).fill(null).map(() => Array(cols).fill(undefined));
};

// Column labels A-Z
const columnLabels = Array(15).fill(null).map((_, i) => String.fromCharCode(65 + i));

// Parse cell reference like "A1" to [row, col]
const parseCellRef = (ref: string): [number, number] | null => {
  const match = ref.match(/^([A-Z]+)(\d+)$/);
  if (!match) return null;
  const col = match[1].split('').reduce((acc, char) => acc * 26 + char.charCodeAt(0) - 64, 0) - 1;
  const row = parseInt(match[2]) - 1;
  return [row, col];
};

// Parse range like "A1:B5"
const parseRange = (range: string): [number, number, number, number] | null => {
  const [start, end] = range.split(':');
  const startRef = parseCellRef(start);
  const endRef = parseCellRef(end);
  if (!startRef || !endRef) return null;
  return [startRef[0], startRef[1], endRef[0], endRef[1]];
};

// Get numeric value from cell
const getNumericValue = (cell: CellBase | undefined): number => {
  if (!cell || cell.value === undefined || cell.value === '') return 0;
  const num = typeof cell.value === 'number' ? cell.value : parseFloat(String(cell.value));
  return isNaN(num) ? 0 : num;
};

// Evaluate formula
const evaluateFormula = (formula: string, data: Matrix): string | number => {
  if (!formula.startsWith('=')) return formula;
  
  const expr = formula.substring(1).toUpperCase();
  
  try {
    // Handle SUM
    const sumMatch = expr.match(/^SUM\(([A-Z]+\d+):([A-Z]+\d+)\)$/);
    if (sumMatch) {
      const range = parseRange(`${sumMatch[1]}:${sumMatch[2]}`);
      if (!range) return '#REF!';
      let sum = 0;
      for (let r = range[0]; r <= range[2]; r++) {
        for (let c = range[1]; c <= range[3]; c++) {
          sum += getNumericValue(data[r]?.[c]);
        }
      }
      return sum;
    }
    
    // Handle AVERAGE
    const avgMatch = expr.match(/^AVERAGE\(([A-Z]+\d+):([A-Z]+\d+)\)$/);
    if (avgMatch) {
      const range = parseRange(`${avgMatch[1]}:${avgMatch[2]}`);
      if (!range) return '#REF!';
      let sum = 0, count = 0;
      for (let r = range[0]; r <= range[2]; r++) {
        for (let c = range[1]; c <= range[3]; c++) {
          const val = getNumericValue(data[r]?.[c]);
          if (val !== 0 || data[r]?.[c]?.value === 0) {
            sum += val;
            count++;
          }
        }
      }
      return count > 0 ? Math.round((sum / count) * 100) / 100 : 0;
    }
    
    // Handle MIN
    const minMatch = expr.match(/^MIN\(([A-Z]+\d+):([A-Z]+\d+)\)$/);
    if (minMatch) {
      const range = parseRange(`${minMatch[1]}:${minMatch[2]}`);
      if (!range) return '#REF!';
      let min = Infinity;
      for (let r = range[0]; r <= range[2]; r++) {
        for (let c = range[1]; c <= range[3]; c++) {
          const val = getNumericValue(data[r]?.[c]);
          if (val < min) min = val;
        }
      }
      return min === Infinity ? 0 : min;
    }
    
    // Handle MAX
    const maxMatch = expr.match(/^MAX\(([A-Z]+\d+):([A-Z]+\d+)\)$/);
    if (maxMatch) {
      const range = parseRange(`${maxMatch[1]}:${maxMatch[2]}`);
      if (!range) return '#REF!';
      let max = -Infinity;
      for (let r = range[0]; r <= range[2]; r++) {
        for (let c = range[1]; c <= range[3]; c++) {
          const val = getNumericValue(data[r]?.[c]);
          if (val > max) max = val;
        }
      }
      return max === -Infinity ? 0 : max;
    }
    
    // Handle COUNT
    const countMatch = expr.match(/^COUNT\(([A-Z]+\d+):([A-Z]+\d+)\)$/);
    if (countMatch) {
      const range = parseRange(`${countMatch[1]}:${countMatch[2]}`);
      if (!range) return '#REF!';
      let count = 0;
      for (let r = range[0]; r <= range[2]; r++) {
        for (let c = range[1]; c <= range[3]; c++) {
          const cell = data[r]?.[c];
          if (cell?.value !== undefined && cell.value !== '' && !isNaN(Number(cell.value))) {
            count++;
          }
        }
      }
      return count;
    }
    
    // Handle simple arithmetic with cell references (e.g., =B2*C2)
    let evalExpr = expr;
    const cellRefs = expr.match(/[A-Z]+\d+/g) || [];
    for (const ref of cellRefs) {
      const pos = parseCellRef(ref);
      if (pos) {
        const val = getNumericValue(data[pos[0]]?.[pos[1]]);
        evalExpr = evalExpr.replace(ref, String(val));
      }
    }
    
    // Safe eval for basic math
    if (/^[\d\s+\-*/().]+$/.test(evalExpr)) {
      const result = Function('"use strict"; return (' + evalExpr + ')')();
      return Math.round(result * 100) / 100;
    }
    
    return formula;
  } catch (e) {
    return '#ERROR!';
  }
};

export default function SpreadsheetPage() {
  const [sheetData, setSheetData] = useState<Matrix>(createEmptyData(30, 15));
  const [showTemplates, setShowTemplates] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);

  // Compute displayed data with formulas evaluated
  const displayData = useMemo(() => {
    return sheetData.map((row, rowIdx) =>
      row.map((cell, colIdx) => {
        if (!cell || cell.value === undefined) return cell;
        const strVal = String(cell.value);
        if (strVal.startsWith('=')) {
          const result = evaluateFormula(strVal, sheetData);
          return { ...cell, value: result };
        }
        return cell;
      })
    );
  }, [sheetData]);

  // Get formula for selected cell
  const selectedFormula = useMemo(() => {
    if (!selectedCell) return '';
    const cell = sheetData[selectedCell.row]?.[selectedCell.col];
    return cell?.value !== undefined ? String(cell.value) : '';
  }, [selectedCell, sheetData]);

  const loadTemplate = useCallback((template: typeof spreadsheetTemplates[0]) => {
    // Pad template to 30x15
    const padded: Matrix = createEmptyData(30, 15);
    template.data.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (r < 30 && c < 15) {
          padded[r][c] = cell;
        }
      });
    });
    setSheetData(padded);
    setShowTemplates(false);
    toast.success(`Loaded: ${template.name}`);
  }, []);

  const clearSheet = useCallback(() => {
    setSheetData(createEmptyData(30, 15));
    toast.success('Sheet cleared');
  }, []);

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

  const handleChange = useCallback((newData: Matrix) => {
    setSheetData(newData);
  }, []);

  const handleSelect = useCallback((selection: any) => {
    if (selection && selection.length > 0 && selection[0]) {
      setSelectedCell({ row: selection[0].row, col: selection[0].column });
    }
  }, []);

  return (
    <>
      <Head>
        <title>Spreadsheet | Computing 7155 Portal</title>
      </Head>

      <style jsx global>{`
        .Spreadsheet {
          --background-color: white;
          --header-background-color: #f1f5f9;
          --border-color: #e2e8f0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        }
        .Spreadsheet__header {
          background: #f1f5f9 !important;
          color: #475569 !important;
          font-weight: 600 !important;
        }
        .Spreadsheet__cell {
          min-width: 80px !important;
          height: 28px !important;
          border-color: #e2e8f0 !important;
        }
        .Spreadsheet__cell--selected {
          box-shadow: inset 0 0 0 2px #3b82f6 !important;
          background: #eff6ff !important;
        }
        .Spreadsheet__cell input {
          font-size: 14px !important;
        }
        .Spreadsheet__data-viewer {
          padding: 4px 8px !important;
          font-size: 14px !important;
        }
        .Spreadsheet__data-editor input {
          padding: 4px 8px !important;
          font-size: 14px !important;
        }
        .Spreadsheet__active-cell {
          background: #dbeafe !important;
        }
        .Spreadsheet__table {
          border-collapse: collapse !important;
        }
      `}</style>

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

        {/* Formula Bar */}
        <div className="mb-2 flex items-center bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
          <div className="px-3 py-2 bg-slate-700 text-slate-300 font-mono text-sm min-w-[60px] text-center border-r border-slate-600">
            {selectedCell ? `${columnLabels[selectedCell.col]}${selectedCell.row + 1}` : '—'}
          </div>
          <div className="flex-1 px-3 py-2 text-white font-mono text-sm">
            {selectedFormula || ''}
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
                <strong>Tips:</strong> Click a cell to select • Type to enter data • Start with = for formulas • Press Enter to confirm
              </p>
            </div>
          </div>
        )}

        {/* Spreadsheet Container */}
        <div className="h-[calc(100%-160px)] bg-white rounded-xl overflow-auto shadow-lg">
          <Spreadsheet
            data={displayData}
            onChange={handleChange}
            onSelect={handleSelect}
            columnLabels={columnLabels}
          />
        </div>
      </div>
    </>
  );
}
