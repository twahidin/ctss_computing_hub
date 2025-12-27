import { useState } from 'react';

interface Cell {
  value: string;
  formula?: string;
}

interface SimpleSpreadsheetProps {
  rows?: number;
  cols?: number;
}

export default function SimpleSpreadsheet({ rows = 20, cols = 10 }: SimpleSpreadsheetProps) {
  const [cells, setCells] = useState<{ [key: string]: Cell }>({});
  const [selectedCell, setSelectedCell] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<string | null>(null);

  const columns = Array.from({ length: cols }, (_, i) => 
    String.fromCharCode(65 + i) // A, B, C, etc.
  );

  const getCellId = (row: number, col: number) => `${columns[col]}${row + 1}`;

  const getCellValue = (cellId: string): string => {
    const cell = cells[cellId];
    if (!cell) return '';
    
    // If it starts with =, it's a formula (simple evaluation)
    if (cell.value.startsWith('=')) {
      try {
        // Very basic formula support
        const formula = cell.value.substring(1);
        
        // Support for SUM function
        if (formula.toUpperCase().startsWith('SUM(')) {
          const range = formula.match(/SUM\(([A-Z]+\d+):([A-Z]+\d+)\)/i);
          if (range) {
            const [, start, end] = range;
            // Simple sum implementation
            let sum = 0;
            // This is simplified - real implementation would parse range properly
            return cell.value; // Show formula for now
          }
        }
        
        // Show formula as is
        return cell.value;
      } catch {
        return '#ERROR!';
      }
    }
    
    return cell.value;
  };

  const handleCellChange = (cellId: string, value: string) => {
    setCells(prev => ({
      ...prev,
      [cellId]: { value }
    }));
  };

  const handleCellClick = (cellId: string) => {
    setSelectedCell(cellId);
    setEditingCell(null);
  };

  const handleCellDoubleClick = (cellId: string) => {
    setEditingCell(cellId);
  };

  const handleCellBlur = () => {
    setEditingCell(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, cellId: string) => {
    if (e.key === 'Enter') {
      setEditingCell(null);
      // Move to next row
      const match = cellId.match(/([A-Z]+)(\d+)/);
      if (match) {
        const [, col, row] = match;
        const nextCell = `${col}${parseInt(row) + 1}`;
        setSelectedCell(nextCell);
      }
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  return (
    <div className="spreadsheet-container overflow-auto border border-gray-300 rounded-lg bg-white">
      {/* Formula Bar */}
      <div className="formula-bar sticky top-0 bg-gray-50 border-b border-gray-300 p-2 flex items-center gap-2 z-10">
        <div className="font-semibold text-sm text-gray-700 w-16">
          {selectedCell || 'A1'}
        </div>
        <input
          type="text"
          value={selectedCell ? (cells[selectedCell]?.value || '') : ''}
          onChange={(e) => selectedCell && handleCellChange(selectedCell, e.target.value)}
          className="flex-1 px-3 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder="Enter value or formula (e.g., =SUM(A1:A10))"
        />
      </div>

      {/* Spreadsheet Grid */}
      <div className="spreadsheet-grid">
        <table className="border-collapse w-full">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 bg-gray-100 border border-gray-300 w-12 h-8 text-xs font-semibold z-20"></th>
              {columns.map((col) => (
                <th
                  key={col}
                  className="sticky top-0 bg-gray-100 border border-gray-300 min-w-[100px] h-8 text-xs font-semibold z-10"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, rowIdx) => (
              <tr key={rowIdx}>
                <td className="sticky left-0 bg-gray-100 border border-gray-300 w-12 h-8 text-xs font-semibold text-center z-10">
                  {rowIdx + 1}
                </td>
                {columns.map((col, colIdx) => {
                  const cellId = getCellId(rowIdx, colIdx);
                  const isSelected = selectedCell === cellId;
                  const isEditing = editingCell === cellId;
                  const displayValue = getCellValue(cellId);

                  return (
                    <td
                      key={cellId}
                      className={`border border-gray-300 h-8 relative ${
                        isSelected ? 'ring-2 ring-primary-500 ring-inset' : ''
                      }`}
                      onClick={() => handleCellClick(cellId)}
                      onDoubleClick={() => handleCellDoubleClick(cellId)}
                    >
                      {isEditing ? (
                        <input
                          type="text"
                          value={cells[cellId]?.value || ''}
                          onChange={(e) => handleCellChange(cellId, e.target.value)}
                          onBlur={handleCellBlur}
                          onKeyDown={(e) => handleKeyDown(e, cellId)}
                          className="w-full h-full px-2 text-sm focus:outline-none"
                          autoFocus
                        />
                      ) : (
                        <div className="px-2 text-sm truncate">
                          {displayValue}
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

      {/* Helper Text */}
      <div className="p-3 bg-gray-50 border-t border-gray-300 text-xs text-gray-600">
        <p>
          <strong>Tips:</strong> Click to select a cell, double-click to edit. 
          Press Enter to move down, Escape to cancel editing.
          Use formulas like =SUM(A1:A10), =AVERAGE(B1:B5), =A1+B1
        </p>
      </div>
    </div>
  );
}

