import { useState, useCallback, useRef, useEffect } from 'react';

interface Cell {
  value: string;
  formula?: string;
}

interface SimpleSpreadsheetProps {
  rows?: number;
  cols?: number;
  data: Record<string, Cell>;
  onChange: (data: Record<string, Cell>) => void;
}

// Convert column number to letter (0 = A, 1 = B, etc.)
const colToLetter = (col: number): string => {
  let letter = '';
  let temp = col;
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
};

// Parse cell reference like "A1" to { col: 0, row: 0 }
const parseCellRef = (ref: string): { col: number; row: number } | null => {
  const match = ref.match(/^([A-Z]+)(\d+)$/i);
  if (!match) return null;
  
  const colStr = match[1].toUpperCase();
  const row = parseInt(match[2], 10) - 1;
  
  let col = 0;
  for (let i = 0; i < colStr.length; i++) {
    col = col * 26 + (colStr.charCodeAt(i) - 64);
  }
  col -= 1;
  
  return { col, row };
};

// Evaluate a formula
const evaluateFormula = (
  formula: string,
  data: Record<string, Cell>,
  visited: Set<string> = new Set()
): string | number => {
  if (!formula.startsWith('=')) return formula;
  
  const expr = formula.slice(1).toUpperCase();
  
  // Handle SUM function
  const sumMatch = expr.match(/^SUM\(([A-Z]+\d+):([A-Z]+\d+)\)$/i);
  if (sumMatch) {
    const start = parseCellRef(sumMatch[1]);
    const end = parseCellRef(sumMatch[2]);
    if (!start || !end) return '#REF!';
    
    let sum = 0;
    for (let r = start.row; r <= end.row; r++) {
      for (let c = start.col; c <= end.col; c++) {
        const key = `${colToLetter(c)}${r + 1}`;
        const cell = data[key];
        if (cell) {
          const val = cell.formula 
            ? evaluateFormula(cell.formula, data, visited)
            : cell.value;
          const num = parseFloat(String(val));
          if (!isNaN(num)) sum += num;
        }
      }
    }
    return sum;
  }
  
  // Handle AVERAGE function
  const avgMatch = expr.match(/^AVERAGE\(([A-Z]+\d+):([A-Z]+\d+)\)$/i);
  if (avgMatch) {
    const start = parseCellRef(avgMatch[1]);
    const end = parseCellRef(avgMatch[2]);
    if (!start || !end) return '#REF!';
    
    let sum = 0;
    let count = 0;
    for (let r = start.row; r <= end.row; r++) {
      for (let c = start.col; c <= end.col; c++) {
        const key = `${colToLetter(c)}${r + 1}`;
        const cell = data[key];
        if (cell) {
          const val = cell.formula 
            ? evaluateFormula(cell.formula, data, visited)
            : cell.value;
          const num = parseFloat(String(val));
          if (!isNaN(num)) {
            sum += num;
            count++;
          }
        }
      }
    }
    return count > 0 ? Math.round((sum / count) * 100) / 100 : 0;
  }
  
  // Handle COUNT function
  const countMatch = expr.match(/^COUNT\(([A-Z]+\d+):([A-Z]+\d+)\)$/i);
  if (countMatch) {
    const start = parseCellRef(countMatch[1]);
    const end = parseCellRef(countMatch[2]);
    if (!start || !end) return '#REF!';
    
    let count = 0;
    for (let r = start.row; r <= end.row; r++) {
      for (let c = start.col; c <= end.col; c++) {
        const key = `${colToLetter(c)}${r + 1}`;
        const cell = data[key];
        if (cell) {
          const val = cell.formula 
            ? evaluateFormula(cell.formula, data, visited)
            : cell.value;
          const num = parseFloat(String(val));
          if (!isNaN(num)) count++;
        }
      }
    }
    return count;
  }
  
  // Handle MAX function
  const maxMatch = expr.match(/^MAX\(([A-Z]+\d+):([A-Z]+\d+)\)$/i);
  if (maxMatch) {
    const start = parseCellRef(maxMatch[1]);
    const end = parseCellRef(maxMatch[2]);
    if (!start || !end) return '#REF!';
    
    let max = -Infinity;
    for (let r = start.row; r <= end.row; r++) {
      for (let c = start.col; c <= end.col; c++) {
        const key = `${colToLetter(c)}${r + 1}`;
        const cell = data[key];
        if (cell) {
          const val = cell.formula 
            ? evaluateFormula(cell.formula, data, visited)
            : cell.value;
          const num = parseFloat(String(val));
          if (!isNaN(num) && num > max) max = num;
        }
      }
    }
    return max === -Infinity ? 0 : max;
  }
  
  // Handle MIN function
  const minMatch = expr.match(/^MIN\(([A-Z]+\d+):([A-Z]+\d+)\)$/i);
  if (minMatch) {
    const start = parseCellRef(minMatch[1]);
    const end = parseCellRef(minMatch[2]);
    if (!start || !end) return '#REF!';
    
    let min = Infinity;
    for (let r = start.row; r <= end.row; r++) {
      for (let c = start.col; c <= end.col; c++) {
        const key = `${colToLetter(c)}${r + 1}`;
        const cell = data[key];
        if (cell) {
          const val = cell.formula 
            ? evaluateFormula(cell.formula, data, visited)
            : cell.value;
          const num = parseFloat(String(val));
          if (!isNaN(num) && num < min) min = num;
        }
      }
    }
    return min === Infinity ? 0 : min;
  }
  
  // Handle cell references in simple expressions
  let result = expr;
  const cellRefs = expr.match(/[A-Z]+\d+/gi) || [];
  
  for (const ref of cellRefs) {
    const key = ref.toUpperCase();
    if (visited.has(key)) return '#CIRCULAR!';
    
    const cell = data[key];
    if (cell) {
      visited.add(key);
      const val = cell.formula 
        ? evaluateFormula(cell.formula, data, visited)
        : cell.value;
      result = result.replace(new RegExp(ref, 'gi'), String(val || 0));
    } else {
      result = result.replace(new RegExp(ref, 'gi'), '0');
    }
  }
  
  // Try to evaluate as math expression
  try {
    // Only allow safe characters
    if (/^[\d\s+\-*/().]+$/.test(result)) {
      const computed = Function('"use strict"; return (' + result + ')')();
      if (typeof computed === 'number' && !isNaN(computed)) {
        return Math.round(computed * 100) / 100;
      }
      return '#ERROR!';
    }
  } catch {
    return '#ERROR!';
  }
  
  return result;
};

export default function SimpleSpreadsheet({
  rows = 20,
  cols = 10,
  data,
  onChange,
}: SimpleSpreadsheetProps) {
  const [selectedCell, setSelectedCell] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [formulaBarValue, setFormulaBarValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const formulaInputRef = useRef<HTMLInputElement>(null);

  // Update formula bar when cell selection changes
  useEffect(() => {
    if (selectedCell) {
      const cell = data[selectedCell];
      setFormulaBarValue(cell?.formula || cell?.value || '');
    } else {
      setFormulaBarValue('');
    }
  }, [selectedCell, data]);

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  const getCellKey = (row: number, col: number) => `${colToLetter(col)}${row + 1}`;

  const getCellDisplay = useCallback((key: string) => {
    const cell = data[key];
    if (!cell) return '';
    if (cell.formula) {
      const result = evaluateFormula(cell.formula, data);
      return String(result);
    }
    return cell.value;
  }, [data]);

  const handleCellClick = (key: string) => {
    if (editingCell && editingCell !== key) {
      commitEdit();
    }
    setSelectedCell(key);
  };

  const handleCellDoubleClick = (key: string) => {
    setEditingCell(key);
    const cell = data[key];
    setEditValue(cell?.formula || cell?.value || '');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditValue(e.target.value);
  };

  const commitEdit = () => {
    if (editingCell) {
      const newData = { ...data };
      if (editValue.startsWith('=')) {
        newData[editingCell] = { value: '', formula: editValue };
      } else {
        newData[editingCell] = { value: editValue };
      }
      onChange(newData);
      setEditingCell(null);
    }
  };

  const handleInputBlur = () => {
    commitEdit();
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      commitEdit();
      // Move to next row
      if (selectedCell) {
        const parsed = parseCellRef(selectedCell);
        if (parsed && parsed.row < rows - 1) {
          const nextKey = getCellKey(parsed.row + 1, parsed.col);
          setSelectedCell(nextKey);
        }
      }
    } else if (e.key === 'Escape') {
      setEditingCell(null);
      setEditValue('');
    } else if (e.key === 'Tab') {
      e.preventDefault();
      commitEdit();
      // Move to next column
      if (selectedCell) {
        const parsed = parseCellRef(selectedCell);
        if (parsed && parsed.col < cols - 1) {
          const nextKey = getCellKey(parsed.row, parsed.col + 1);
          setSelectedCell(nextKey);
        }
      }
    }
  };

  const handleFormulaBarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormulaBarValue(e.target.value);
  };

  const handleFormulaBarKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && selectedCell) {
      const newData = { ...data };
      if (formulaBarValue.startsWith('=')) {
        newData[selectedCell] = { value: '', formula: formulaBarValue };
      } else {
        newData[selectedCell] = { value: formulaBarValue };
      }
      onChange(newData);
      formulaInputRef.current?.blur();
    } else if (e.key === 'Escape') {
      const cell = data[selectedCell || ''];
      setFormulaBarValue(cell?.formula || cell?.value || '');
      formulaInputRef.current?.blur();
    }
  };

  const handleFormulaBarBlur = () => {
    if (selectedCell && formulaBarValue !== (data[selectedCell]?.formula || data[selectedCell]?.value || '')) {
      const newData = { ...data };
      if (formulaBarValue.startsWith('=')) {
        newData[selectedCell] = { value: '', formula: formulaBarValue };
      } else {
        newData[selectedCell] = { value: formulaBarValue };
      }
      onChange(newData);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (editingCell) return;
    
    if (!selectedCell) return;
    const parsed = parseCellRef(selectedCell);
    if (!parsed) return;

    let newRow = parsed.row;
    let newCol = parsed.col;

    switch (e.key) {
      case 'ArrowUp':
        newRow = Math.max(0, parsed.row - 1);
        break;
      case 'ArrowDown':
        newRow = Math.min(rows - 1, parsed.row + 1);
        break;
      case 'ArrowLeft':
        newCol = Math.max(0, parsed.col - 1);
        break;
      case 'ArrowRight':
        newCol = Math.min(cols - 1, parsed.col + 1);
        break;
      case 'Enter':
        handleCellDoubleClick(selectedCell);
        return;
      case 'Delete':
      case 'Backspace':
        if (selectedCell && data[selectedCell]) {
          const newData = { ...data };
          delete newData[selectedCell];
          onChange(newData);
        }
        return;
      default:
        // Start typing in cell
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
          setEditingCell(selectedCell);
          setEditValue(e.key);
          return;
        }
        return;
    }

    e.preventDefault();
    setSelectedCell(getCellKey(newRow, newCol));
  };

  return (
    <div className="flex flex-col h-full bg-white" tabIndex={0} onKeyDown={handleKeyDown}>
      {/* Formula Bar */}
      <div className="flex items-center border-b border-slate-300 bg-slate-50 px-2 py-1 flex-shrink-0">
        <div className="w-16 text-center font-mono text-sm font-medium text-slate-600 border-r border-slate-300 pr-2">
          {selectedCell || ''}
        </div>
        <div className="flex-1 flex items-center px-2">
          <span className="text-slate-400 mr-2 text-sm">fx</span>
          <input
            ref={formulaInputRef}
            type="text"
            value={formulaBarValue}
            onChange={handleFormulaBarChange}
            onKeyDown={handleFormulaBarKeyDown}
            onBlur={handleFormulaBarBlur}
            placeholder={selectedCell ? "Enter value or formula (start with =)" : "Select a cell"}
            className="flex-1 px-2 py-1 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            disabled={!selectedCell}
          />
        </div>
      </div>

      {/* Spreadsheet Grid */}
      <div className="overflow-auto flex-1">
        <table className="border-collapse min-w-full">
          <thead className="sticky top-0 z-10">
            <tr>
              <th className="w-12 h-8 bg-slate-200 border border-slate-300 text-xs font-medium text-slate-600"></th>
              {Array.from({ length: cols }, (_, c) => (
                <th
                  key={c}
                  className="w-24 min-w-[96px] h-8 bg-slate-200 border border-slate-300 text-xs font-medium text-slate-600"
                >
                  {colToLetter(c)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }, (_, r) => (
              <tr key={r}>
                <td className="w-12 h-7 bg-slate-100 border border-slate-300 text-center text-xs font-medium text-slate-600 sticky left-0">
                  {r + 1}
                </td>
                {Array.from({ length: cols }, (_, c) => {
                  const key = getCellKey(r, c);
                  const isSelected = selectedCell === key;
                  const isEditing = editingCell === key;
                  const cell = data[key];
                  const hasFormula = cell?.formula;
                  
                  return (
                    <td
                      key={c}
                      className={`w-24 min-w-[96px] h-7 border border-slate-200 p-0 relative cursor-cell ${
                        isSelected ? 'ring-2 ring-indigo-500 ring-inset bg-indigo-50' : ''
                      } ${hasFormula ? 'bg-blue-50' : ''}`}
                      onClick={() => handleCellClick(key)}
                      onDoubleClick={() => handleCellDoubleClick(key)}
                    >
                      {isEditing ? (
                        <input
                          ref={inputRef}
                          type="text"
                          value={editValue}
                          onChange={handleInputChange}
                          onBlur={handleInputBlur}
                          onKeyDown={handleInputKeyDown}
                          className="w-full h-full px-1 text-sm border-none outline-none bg-white"
                        />
                      ) : (
                        <div className="w-full h-full px-1 text-sm truncate leading-7 text-slate-800">
                          {getCellDisplay(key)}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
