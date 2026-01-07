import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import Head from 'next/head';
import { FiSave, FiHelpCircle, FiChevronDown, FiRefreshCw } from 'react-icons/fi';
import toast from 'react-hot-toast';

// Constants
const ROWS = 30;
const COLS = 15;
const COL_LABELS = Array.from({ length: COLS }, (_, i) => String.fromCharCode(65 + i));

// Types
interface CellData {
  value: string;
}

type SheetData = Record<string, CellData>;

// Sample templates
const spreadsheetTemplates: { name: string; description: string; data: SheetData }[] = [
  {
    name: 'VLOOKUP Practice',
    description: 'Practice using VLOOKUP for exact matching',
    data: {
      'A1': { value: 'Student ID' }, 'B1': { value: 'Name' }, 'C1': { value: 'Score' }, 'D1': { value: 'Grade' },
      'F1': { value: 'Min Score' }, 'G1': { value: 'Grade' },
      'A2': { value: 'S001' }, 'B2': { value: 'Alice' }, 'C2': { value: '85' },
      'F2': { value: '0' }, 'G2': { value: 'F' },
      'A3': { value: 'S002' }, 'B3': { value: 'Bob' }, 'C3': { value: '72' },
      'F3': { value: '50' }, 'G3': { value: 'D' },
      'A4': { value: 'S003' }, 'B4': { value: 'Charlie' }, 'C4': { value: '91' },
      'F4': { value: '60' }, 'G4': { value: 'C' },
      'F5': { value: '70' }, 'G5': { value: 'B' },
      'F6': { value: '80' }, 'G6': { value: 'A' },
    },
  },
  {
    name: 'Statistical Functions',
    description: 'Practice SUM, AVERAGE, COUNT, MIN, MAX',
    data: {
      'A1': { value: 'Month' }, 'B1': { value: 'Sales' },
      'A2': { value: 'Jan' }, 'B2': { value: '1500' },
      'A3': { value: 'Feb' }, 'B3': { value: '2300' },
      'A4': { value: 'Mar' }, 'B4': { value: '1800' },
      'A5': { value: 'Apr' }, 'B5': { value: '2100' },
      'A6': { value: 'May' }, 'B6': { value: '2800' },
      'A8': { value: 'Total:' }, 'B8': { value: '=SUM(B2:B6)' },
      'A9': { value: 'Average:' }, 'B9': { value: '=AVERAGE(B2:B6)' },
      'A10': { value: 'Max:' }, 'B10': { value: '=MAX(B2:B6)' },
      'A11': { value: 'Min:' }, 'B11': { value: '=MIN(B2:B6)' },
      'A12': { value: 'Count:' }, 'B12': { value: '=COUNT(B2:B6)' },
    },
  },
  {
    name: 'Simple Calculations',
    description: 'Practice basic formulas and cell references',
    data: {
      'A1': { value: 'Item' }, 'B1': { value: 'Qty' }, 'C1': { value: 'Price' }, 'D1': { value: 'Total' },
      'A2': { value: 'Apples' }, 'B2': { value: '10' }, 'C2': { value: '1.50' }, 'D2': { value: '=B2*C2' },
      'A3': { value: 'Oranges' }, 'B3': { value: '8' }, 'C3': { value: '2.00' }, 'D3': { value: '=B3*C3' },
      'A4': { value: 'Bananas' }, 'B4': { value: '12' }, 'C4': { value: '0.75' }, 'D4': { value: '=B4*C4' },
      'A6': { value: 'Grand Total:' }, 'D6': { value: '=SUM(D2:D4)' },
    },
  },
  {
    name: 'Inventory Tracker',
    description: 'Practice conditional logic and calculations',
    data: {
      'A1': { value: 'Product' }, 'B1': { value: 'Category' }, 'C1': { value: 'Price' }, 'D1': { value: 'Stock' },
      'A2': { value: 'Laptop' }, 'B2': { value: 'Electronics' }, 'C2': { value: '1200' }, 'D2': { value: '15' },
      'A3': { value: 'Mouse' }, 'B3': { value: 'Electronics' }, 'C3': { value: '25' }, 'D3': { value: '50' },
      'A4': { value: 'Desk' }, 'B4': { value: 'Furniture' }, 'C4': { value: '300' }, 'D4': { value: '8' },
      'A5': { value: 'Chair' }, 'B5': { value: 'Furniture' }, 'C5': { value: '150' }, 'D5': { value: '20' },
      'A7': { value: 'Total Stock:' }, 'D7': { value: '=SUM(D2:D5)' },
      'A8': { value: 'Avg Price:' }, 'C8': { value: '=AVERAGE(C2:C5)' },
    },
  },
];

// Utility functions
const getCellId = (row: number, col: number): string => `${COL_LABELS[col]}${row + 1}`;

const parseCellRef = (ref: string): [number, number] | null => {
  const match = ref.match(/^([A-Z]+)(\d+)$/);
  if (!match) return null;
  const col = match[1].charCodeAt(0) - 65;
  const row = parseInt(match[2]) - 1;
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return null;
  return [row, col];
};

const parseRange = (range: string): [number, number, number, number] | null => {
  const parts = range.split(':');
  if (parts.length !== 2) return null;
  const start = parseCellRef(parts[0]);
  const end = parseCellRef(parts[1]);
  if (!start || !end) return null;
  return [start[0], start[1], end[0], end[1]];
};

const getNumericValue = (val: string | undefined): number => {
  if (!val || val === '') return 0;
  const num = parseFloat(val);
  return isNaN(num) ? 0 : num;
};

const evaluateFormula = (formula: string, data: SheetData, visited: Set<string> = new Set()): string => {
  if (!formula.startsWith('=')) return formula;
  
  const expr = formula.substring(1).toUpperCase().trim();
  
  try {
    // SUM
    const sumMatch = expr.match(/^SUM\(([A-Z]+\d+):([A-Z]+\d+)\)$/);
    if (sumMatch) {
      const range = parseRange(`${sumMatch[1]}:${sumMatch[2]}`);
      if (!range) return '#REF!';
      let sum = 0;
      for (let r = range[0]; r <= range[2]; r++) {
        for (let c = range[1]; c <= range[3]; c++) {
          const id = getCellId(r, c);
          const cellVal = data[id]?.value || '';
          const newVisited = new Set(Array.from(visited));
          newVisited.add(id);
          const resolved = cellVal.startsWith('=') && !visited.has(id)
            ? evaluateFormula(cellVal, data, newVisited)
            : cellVal;
          sum += getNumericValue(resolved);
        }
      }
      return String(Math.round(sum * 100) / 100);
    }

    // AVERAGE
    const avgMatch = expr.match(/^AVERAGE\(([A-Z]+\d+):([A-Z]+\d+)\)$/);
    if (avgMatch) {
      const range = parseRange(`${avgMatch[1]}:${avgMatch[2]}`);
      if (!range) return '#REF!';
      let sum = 0, count = 0;
      for (let r = range[0]; r <= range[2]; r++) {
        for (let c = range[1]; c <= range[3]; c++) {
          const id = getCellId(r, c);
          const cellVal = data[id]?.value || '';
          const newVisited = new Set(Array.from(visited));
          newVisited.add(id);
          const resolved = cellVal.startsWith('=') && !visited.has(id)
            ? evaluateFormula(cellVal, data, newVisited)
            : cellVal;
          const num = getNumericValue(resolved);
          if (resolved !== '' && !isNaN(parseFloat(resolved))) {
            sum += num;
            count++;
          }
        }
      }
      return count > 0 ? String(Math.round((sum / count) * 100) / 100) : '0';
    }

    // MIN
    const minMatch = expr.match(/^MIN\(([A-Z]+\d+):([A-Z]+\d+)\)$/);
    if (minMatch) {
      const range = parseRange(`${minMatch[1]}:${minMatch[2]}`);
      if (!range) return '#REF!';
      let min = Infinity;
      for (let r = range[0]; r <= range[2]; r++) {
        for (let c = range[1]; c <= range[3]; c++) {
          const id = getCellId(r, c);
          const cellVal = data[id]?.value || '';
          const newVisited = new Set(Array.from(visited));
          newVisited.add(id);
          const resolved = cellVal.startsWith('=') && !visited.has(id)
            ? evaluateFormula(cellVal, data, newVisited)
            : cellVal;
          if (resolved !== '' && !isNaN(parseFloat(resolved))) {
            const num = getNumericValue(resolved);
            if (num < min) min = num;
          }
        }
      }
      return min === Infinity ? '0' : String(min);
    }

    // MAX
    const maxMatch = expr.match(/^MAX\(([A-Z]+\d+):([A-Z]+\d+)\)$/);
    if (maxMatch) {
      const range = parseRange(`${maxMatch[1]}:${maxMatch[2]}`);
      if (!range) return '#REF!';
      let max = -Infinity;
      for (let r = range[0]; r <= range[2]; r++) {
        for (let c = range[1]; c <= range[3]; c++) {
          const id = getCellId(r, c);
          const cellVal = data[id]?.value || '';
          const newVisited = new Set(Array.from(visited));
          newVisited.add(id);
          const resolved = cellVal.startsWith('=') && !visited.has(id)
            ? evaluateFormula(cellVal, data, newVisited)
            : cellVal;
          if (resolved !== '' && !isNaN(parseFloat(resolved))) {
            const num = getNumericValue(resolved);
            if (num > max) max = num;
          }
        }
      }
      return max === -Infinity ? '0' : String(max);
    }

    // COUNT
    const countMatch = expr.match(/^COUNT\(([A-Z]+\d+):([A-Z]+\d+)\)$/);
    if (countMatch) {
      const range = parseRange(`${countMatch[1]}:${countMatch[2]}`);
      if (!range) return '#REF!';
      let count = 0;
      for (let r = range[0]; r <= range[2]; r++) {
        for (let c = range[1]; c <= range[3]; c++) {
          const id = getCellId(r, c);
          const cellVal = data[id]?.value || '';
          const newVisited = new Set(Array.from(visited));
          newVisited.add(id);
          const resolved = cellVal.startsWith('=') && !visited.has(id)
            ? evaluateFormula(cellVal, data, newVisited)
            : cellVal;
          if (resolved !== '' && !isNaN(parseFloat(resolved))) {
            count++;
          }
        }
      }
      return String(count);
    }

    // Basic arithmetic with cell references
    let evalExpr = expr;
    const cellRefs = expr.match(/[A-Z]+\d+/g) || [];
    for (const ref of cellRefs) {
      const pos = parseCellRef(ref);
      if (pos) {
        const id = getCellId(pos[0], pos[1]);
        if (visited.has(id)) return '#CIRC!';
        const cellVal = data[id]?.value || '0';
        const newVisited = new Set(Array.from(visited));
        newVisited.add(id);
        const resolved = cellVal.startsWith('=')
          ? evaluateFormula(cellVal, data, newVisited)
          : cellVal;
        evalExpr = evalExpr.replace(new RegExp(ref, 'g'), getNumericValue(resolved).toString());
      }
    }

    if (/^[\d\s+\-*/().]+$/.test(evalExpr)) {
      const result = Function('"use strict"; return (' + evalExpr + ')')();
      return String(Math.round(result * 100) / 100);
    }

    return formula;
  } catch {
    return '#ERROR!';
  }
};

// Cell component
interface CellProps {
  cellId: string;
  value: string;
  displayValue: string;
  isSelected: boolean;
  isEditing: boolean;
  onSelect: () => void;
  onDoubleClick: () => void;
  onChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onBlur: () => void;
}

function Cell({ cellId, value, displayValue, isSelected, isEditing, onSelect, onDoubleClick, onChange, onKeyDown, onBlur }: CellProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  return (
    <td
      className={`border border-slate-200 min-w-[80px] h-[32px] p-0 relative ${
        isSelected ? 'outline outline-2 outline-blue-500 outline-offset-[-1px] bg-blue-50' : 'bg-white'
      }`}
      onClick={onSelect}
      onDoubleClick={onDoubleClick}
    >
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={onBlur}
          className="w-full h-full px-2 text-sm border-none outline-none bg-white"
        />
      ) : (
        <div className="w-full h-full px-2 text-sm flex items-center truncate">
          {displayValue}
        </div>
      )}
    </td>
  );
}

export default function SpreadsheetPage() {
  const [data, setData] = useState<SheetData>({});
  const [selectedCell, setSelectedCell] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Computed display values
  const displayValues = useMemo(() => {
    const result: Record<string, string> = {};
    Object.keys(data).forEach((id) => {
      const val = data[id]?.value || '';
      result[id] = val.startsWith('=') ? evaluateFormula(val, data) : val;
    });
    return result;
  }, [data]);

  const handleCellSelect = useCallback((cellId: string) => {
    if (editingCell && editingCell !== cellId) {
      setEditingCell(null);
    }
    setSelectedCell(cellId);
  }, [editingCell]);

  const handleCellDoubleClick = useCallback((cellId: string) => {
    setEditingCell(cellId);
  }, []);

  const handleCellChange = useCallback((cellId: string, value: string) => {
    setData((prev) => ({
      ...prev,
      [cellId]: { value },
    }));
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, row: number, col: number) => {
    const currentId = getCellId(row, col);

    if (e.key === 'Enter') {
      e.preventDefault();
      setEditingCell(null);
      // Move down
      if (row < ROWS - 1) {
        const nextId = getCellId(row + 1, col);
        setSelectedCell(nextId);
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      setEditingCell(null);
      // Move right
      if (col < COLS - 1) {
        const nextId = getCellId(row, col + 1);
        setSelectedCell(nextId);
      }
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  }, []);

  const handleGridKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!selectedCell || editingCell) return;

    const pos = parseCellRef(selectedCell);
    if (!pos) return;
    const [row, col] = pos;

    if (e.key === 'ArrowUp' && row > 0) {
      setSelectedCell(getCellId(row - 1, col));
    } else if (e.key === 'ArrowDown' && row < ROWS - 1) {
      setSelectedCell(getCellId(row + 1, col));
    } else if (e.key === 'ArrowLeft' && col > 0) {
      setSelectedCell(getCellId(row, col - 1));
    } else if (e.key === 'ArrowRight' && col < COLS - 1) {
      setSelectedCell(getCellId(row, col + 1));
    } else if (e.key === 'Enter' || e.key === 'F2') {
      setEditingCell(selectedCell);
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      if (!editingCell) {
        setData((prev) => {
          const next = { ...prev };
          delete next[selectedCell];
          return next;
        });
      }
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      // Start typing
      setEditingCell(selectedCell);
      setData((prev) => ({
        ...prev,
        [selectedCell]: { value: e.key },
      }));
    }
  }, [selectedCell, editingCell]);

  const loadTemplate = useCallback((template: typeof spreadsheetTemplates[0]) => {
    setData({ ...template.data });
    setSelectedCell(null);
    setEditingCell(null);
    setShowTemplates(false);
    toast.success(`Loaded: ${template.name}`);
  }, []);

  const clearSheet = useCallback(() => {
    setData({});
    setSelectedCell(null);
    setEditingCell(null);
    toast.success('Sheet cleared');
  }, []);

  const handleSave = async () => {
    try {
      await fetch('/api/spreadsheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'My Spreadsheet', data }),
      });
      toast.success('Spreadsheet saved!');
    } catch {
      toast.error('Failed to save spreadsheet');
    }
  };

  const selectedValue = selectedCell ? data[selectedCell]?.value || '' : '';

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
            <p className="text-slate-400 mt-1">Practice Excel functions for Module 3</p>
          </div>
          <div className="flex items-center space-x-3 mt-4 sm:mt-0">
            {/* Templates */}
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
                      <div className="font-medium text-white">{template.name}</div>
                      <div className="text-sm text-slate-400">{template.description}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={clearSheet}
              className="flex items-center px-4 py-2 bg-slate-700 text-slate-200 rounded-lg hover:bg-slate-600 transition-colors"
            >
              <FiRefreshCw className="mr-2" />
              Clear
            </button>

            <button
              onClick={() => setShowHelp(!showHelp)}
              className="flex items-center px-4 py-2 bg-slate-700 text-slate-200 rounded-lg hover:bg-slate-600 transition-colors"
            >
              <FiHelpCircle className="mr-2" />
              Functions
            </button>

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
            {selectedCell || '—'}
          </div>
          <input
            type="text"
            value={selectedValue}
            onChange={(e) => selectedCell && handleCellChange(selectedCell, e.target.value)}
            onFocus={() => selectedCell && setEditingCell(selectedCell)}
            className="flex-1 px-3 py-2 bg-slate-800 text-white font-mono text-sm outline-none"
            placeholder="Select a cell..."
          />
        </div>

        {/* Help */}
        {showHelp && (
          <div className="mb-4 bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-4">
            <h3 className="font-semibold text-white mb-3">Supported Functions</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
              <div>
                <h4 className="font-medium text-emerald-400 mb-1">Math</h4>
                <p className="text-slate-400">=SUM(A1:A10), +, -, *, /</p>
              </div>
              <div>
                <h4 className="font-medium text-blue-400 mb-1">Statistical</h4>
                <p className="text-slate-400">=AVERAGE(A1:A10), =COUNT(A1:A10)</p>
              </div>
              <div>
                <h4 className="font-medium text-purple-400 mb-1">Min/Max</h4>
                <p className="text-slate-400">=MIN(A1:A10), =MAX(A1:A10)</p>
              </div>
              <div>
                <h4 className="font-medium text-amber-400 mb-1">References</h4>
                <p className="text-slate-400">=A1+B1, =A1*2</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              <strong>Tips:</strong> Click cell → type or double-click to edit. Arrow keys to navigate. Enter/Tab to confirm.
            </p>
          </div>
        )}

        {/* Spreadsheet Grid */}
        <div
          className="bg-white rounded-xl overflow-auto shadow-lg"
          style={{ height: 'calc(100% - 140px)' }}
          tabIndex={0}
          onKeyDown={handleGridKeyDown}
        >
          <table className="border-collapse w-full">
            <thead className="sticky top-0 z-10">
              <tr>
                <th className="bg-slate-100 border border-slate-200 w-[50px] h-[32px] text-xs font-semibold text-slate-500"></th>
                {COL_LABELS.map((label) => (
                  <th
                    key={label}
                    className="bg-slate-100 border border-slate-200 min-w-[80px] h-[32px] text-xs font-semibold text-slate-600"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: ROWS }, (_, row) => (
                <tr key={row}>
                  <td className="bg-slate-100 border border-slate-200 text-center text-xs font-semibold text-slate-500 sticky left-0 z-10">
                    {row + 1}
                  </td>
                  {Array.from({ length: COLS }, (_, col) => {
                    const cellId = getCellId(row, col);
                    const cellValue = data[cellId]?.value || '';
                    const displayValue = displayValues[cellId] || '';

                    return (
                      <Cell
                        key={cellId}
                        cellId={cellId}
                        value={cellValue}
                        displayValue={displayValue}
                        isSelected={selectedCell === cellId}
                        isEditing={editingCell === cellId}
                        onSelect={() => handleCellSelect(cellId)}
                        onDoubleClick={() => handleCellDoubleClick(cellId)}
                        onChange={(val) => handleCellChange(cellId, val)}
                        onKeyDown={(e) => handleKeyDown(e, row, col)}
                        onBlur={() => setEditingCell(null)}
                      />
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
