import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import Head from 'next/head';
import { FiSave, FiHelpCircle, FiChevronDown, FiRefreshCw, FiTarget, FiDroplet, FiX } from 'react-icons/fi';
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

interface Selection {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

// Conditional Formatting Rule Types
type ConditionType = 
  | 'greaterThan' | 'lessThan' | 'equalTo' | 'notEqualTo' 
  | 'between' | 'notBetween'
  | 'containsText' | 'notContainsText'
  | 'duplicateValues' | 'uniqueValues'
  | 'top10' | 'bottom10' | 'aboveAverage' | 'belowAverage';

interface ConditionalFormatRule {
  id: string;
  range: string; // e.g., "A1:B10"
  conditionType: ConditionType;
  value1: string;
  value2?: string; // for 'between' conditions
  format: {
    backgroundColor?: string;
    textColor?: string;
    bold?: boolean;
    italic?: boolean;
  };
}

// Goal Seek State
interface GoalSeekState {
  targetCell: string;
  targetValue: string;
  changingCell: string;
  result?: number;
  isRunning: boolean;
}

// ============================================
// FORMULA EVALUATION ENGINE - 7155 SYLLABUS
// ============================================

const getCellId = (row: number, col: number): string => `${COL_LABELS[col]}${row + 1}`;

const parseCellRef = (ref: string): [number, number] | null => {
  // Strip $ signs for absolute/mixed references before parsing
  const cleanRef = ref.replace(/\$/g, '');
  const match = cleanRef.match(/^([A-Z]+)(\d+)$/);
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
  return [Math.min(start[0], end[0]), Math.min(start[1], end[1]), Math.max(start[0], end[0]), Math.max(start[1], end[1])];
};

const getNumericValue = (val: string | undefined): number => {
  if (!val || val === '') return 0;
  const num = parseFloat(val);
  return isNaN(num) ? 0 : num;
};

const isNumeric = (val: string | undefined): boolean => {
  if (!val || val === '') return false;
  return !isNaN(parseFloat(val));
};

const getCellValue = (id: string, data: SheetData, visited: Set<string>): string => {
  const cellVal = data[id]?.value || '';
  if (cellVal.startsWith('=') && !visited.has(id)) {
    const newVisited = new Set(Array.from(visited));
    newVisited.add(id);
    return evaluateFormula(cellVal, data, newVisited);
  }
  return cellVal;
};

const getRangeValues = (range: string, data: SheetData, visited: Set<string>): string[] => {
  const parsed = parseRange(range);
  if (!parsed) return [];
  const values: string[] = [];
  for (let r = parsed[0]; r <= parsed[2]; r++) {
    for (let c = parsed[1]; c <= parsed[3]; c++) {
      values.push(getCellValue(getCellId(r, c), data, visited));
    }
  }
  return values;
};

const getRangeNumericValues = (range: string, data: SheetData, visited: Set<string>): number[] => {
  return getRangeValues(range, data, visited)
    .filter(v => isNumeric(v))
    .map(v => parseFloat(v));
};

// Parse cell reference with absolute/mixed reference support
// Returns: [row, col, isRowAbsolute, isColAbsolute]
const parseCellRefWithAbsolute = (ref: string): [number, number, boolean, boolean] | null => {
  // Match patterns like A1, $A1, A$1, $A$1
  const match = ref.match(/^(\$?)([A-Z]+)(\$?)(\d+)$/);
  if (!match) return null;
  const isColAbsolute = match[1] === '$';
  const col = match[2].charCodeAt(0) - 65;
  const isRowAbsolute = match[3] === '$';
  const row = parseInt(match[4]) - 1;
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return null;
  return [row, col, isRowAbsolute, isColAbsolute];
};

// Adjust cell references in formula when copying - supports absolute ($A$1), mixed ($A1, A$1), and relative (A1)
const adjustFormula = (formula: string, rowDelta: number, colDelta: number): string => {
  if (!formula.startsWith('=')) return formula;
  
  // Match cell references including $ signs for absolute/mixed references
  return formula.replace(/(\$?)([A-Z]+)(\$?)(\d+)/g, (match, dollarCol, col, dollarRow, row) => {
    const isColAbsolute = dollarCol === '$';
    const isRowAbsolute = dollarRow === '$';
    
    // Calculate new positions (only adjust if not absolute)
    const newColIndex = isColAbsolute ? (col.charCodeAt(0) - 65) : (col.charCodeAt(0) - 65 + colDelta);
    const newRowIndex = isRowAbsolute ? (parseInt(row) - 1) : (parseInt(row) - 1 + rowDelta);
    
    if (newColIndex < 0 || newColIndex >= COLS || newRowIndex < 0 || newRowIndex >= ROWS) {
      return match; // Keep original if out of bounds
    }
    
    // Reconstruct the reference with $ signs preserved
    return `${dollarCol}${String.fromCharCode(65 + newColIndex)}${dollarRow}${newRowIndex + 1}`;
  });
};

// Main formula evaluator
const evaluateFormula = (formula: string, data: SheetData, visited: Set<string> = new Set()): string => {
  if (!formula.startsWith('=')) return formula;
  
  let expr = formula.substring(1).trim();
  
  try {
    // ============ DATE/TIME FUNCTIONS ============
    if (expr.toUpperCase() === 'NOW()') {
      const now = new Date();
      return now.toLocaleString();
    }
    if (expr.toUpperCase() === 'TODAY()') {
      const today = new Date();
      return today.toLocaleDateString();
    }
    
    // DAYS(end_date, start_date)
    const daysMatch = expr.match(/^DAYS\s*\(\s*(.+?)\s*,\s*(.+?)\s*\)$/i);
    if (daysMatch) {
      const end = new Date(getCellValue(daysMatch[1].trim(), data, visited) || daysMatch[1]);
      const start = new Date(getCellValue(daysMatch[2].trim(), data, visited) || daysMatch[2]);
      if (isNaN(end.getTime()) || isNaN(start.getTime())) return '#VALUE!';
      return String(Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    }

    // ============ LOGICAL FUNCTIONS ============
    // IF(condition, true_value, false_value)
    const ifMatch = expr.match(/^IF\s*\(\s*(.+?)\s*,\s*(.+?)\s*,\s*(.+?)\s*\)$/i);
    if (ifMatch) {
      const condition = evaluateCondition(ifMatch[1], data, visited);
      const trueVal = ifMatch[2].trim();
      const falseVal = ifMatch[3].trim();
      const result = condition ? trueVal : falseVal;
      if (parseCellRef(result.toUpperCase())) {
        return getCellValue(result.toUpperCase(), data, visited);
      }
      if ((result.startsWith('"') && result.endsWith('"')) || (result.startsWith("'") && result.endsWith("'"))) {
        return result.slice(1, -1);
      }
      return result;
    }

    // AND(condition1, condition2, ...)
    const andMatch = expr.match(/^AND\s*\(\s*(.+)\s*\)$/i);
    if (andMatch) {
      const conditions = splitArgs(andMatch[1]);
      const result = conditions.every(c => evaluateCondition(c, data, visited));
      return result ? 'TRUE' : 'FALSE';
    }

    // OR(condition1, condition2, ...)
    const orMatch = expr.match(/^OR\s*\(\s*(.+)\s*\)$/i);
    if (orMatch) {
      const conditions = splitArgs(orMatch[1]);
      const result = conditions.some(c => evaluateCondition(c, data, visited));
      return result ? 'TRUE' : 'FALSE';
    }

    // NOT(condition)
    const notMatch = expr.match(/^NOT\s*\(\s*(.+)\s*\)$/i);
    if (notMatch) {
      const result = !evaluateCondition(notMatch[1], data, visited);
      return result ? 'TRUE' : 'FALSE';
    }

    // ============ MATHEMATICAL FUNCTIONS ============
    // SUM(range)
    const sumMatch = expr.match(/^SUM\s*\(\s*([A-Z]+\d+:[A-Z]+\d+)\s*\)$/i);
    if (sumMatch) {
      const values = getRangeNumericValues(sumMatch[1].toUpperCase(), data, visited);
      return String(Math.round(values.reduce((a, b) => a + b, 0) * 100) / 100);
    }

    // SUMIF(range, criteria, [sum_range])
    const sumifMatch = expr.match(/^SUMIF\s*\(\s*([A-Z]+\d+:[A-Z]+\d+)\s*,\s*(.+?)(?:\s*,\s*([A-Z]+\d+:[A-Z]+\d+))?\s*\)$/i);
    if (sumifMatch) {
      const criteriaRange = parseRange(sumifMatch[1].toUpperCase());
      const criteria = sumifMatch[2].trim().replace(/^["']|["']$/g, '');
      const sumRangeStr = sumifMatch[3]?.toUpperCase() || sumifMatch[1].toUpperCase();
      const sumRange = parseRange(sumRangeStr);
      if (!criteriaRange || !sumRange) return '#REF!';
      
      let sum = 0;
      let idx = 0;
      for (let r = criteriaRange[0]; r <= criteriaRange[2]; r++) {
        for (let c = criteriaRange[1]; c <= criteriaRange[3]; c++) {
          const cellVal = getCellValue(getCellId(r, c), data, visited);
          if (matchesCriteria(cellVal, criteria)) {
            const sumR = sumRange[0] + Math.floor(idx / (criteriaRange[3] - criteriaRange[1] + 1));
            const sumC = sumRange[1] + (idx % (criteriaRange[3] - criteriaRange[1] + 1));
            sum += getNumericValue(getCellValue(getCellId(sumR, sumC), data, visited));
          }
          idx++;
        }
      }
      return String(Math.round(sum * 100) / 100);
    }

    // ROUND(number, digits)
    const roundMatch = expr.match(/^ROUND\s*\(\s*(.+?)\s*,\s*(\d+)\s*\)$/i);
    if (roundMatch) {
      const num = getNumericValue(resolveValue(roundMatch[1], data, visited));
      const digits = parseInt(roundMatch[2]);
      const factor = Math.pow(10, digits);
      return String(Math.round(num * factor) / factor);
    }

    // ROUNDUP(number, digits)
    const roundupMatch = expr.match(/^ROUNDUP\s*\(\s*(.+?)\s*,\s*(\d+)\s*\)$/i);
    if (roundupMatch) {
      const num = getNumericValue(resolveValue(roundupMatch[1], data, visited));
      const digits = parseInt(roundupMatch[2]);
      const factor = Math.pow(10, digits);
      return String(Math.ceil(num * factor) / factor);
    }

    // ROUNDDOWN(number, digits)
    const rounddownMatch = expr.match(/^ROUNDDOWN\s*\(\s*(.+?)\s*,\s*(\d+)\s*\)$/i);
    if (rounddownMatch) {
      const num = getNumericValue(resolveValue(rounddownMatch[1], data, visited));
      const digits = parseInt(rounddownMatch[2]);
      const factor = Math.pow(10, digits);
      return String(Math.floor(num * factor) / factor);
    }

    // CEILING.MATH(number, [significance])
    const ceilingMatch = expr.match(/^CEILING\.MATH\s*\(\s*(.+?)(?:\s*,\s*(.+?))?\s*\)$/i);
    if (ceilingMatch) {
      const num = getNumericValue(resolveValue(ceilingMatch[1], data, visited));
      const sig = ceilingMatch[2] ? getNumericValue(resolveValue(ceilingMatch[2], data, visited)) : 1;
      return String(Math.ceil(num / sig) * sig);
    }

    // FLOOR.MATH(number, [significance])
    const floorMatch = expr.match(/^FLOOR\.MATH\s*\(\s*(.+?)(?:\s*,\s*(.+?))?\s*\)$/i);
    if (floorMatch) {
      const num = getNumericValue(resolveValue(floorMatch[1], data, visited));
      const sig = floorMatch[2] ? getNumericValue(resolveValue(floorMatch[2], data, visited)) : 1;
      return String(Math.floor(num / sig) * sig);
    }

    // MOD(number, divisor)
    const modMatch = expr.match(/^MOD\s*\(\s*(.+?)\s*,\s*(.+?)\s*\)$/i);
    if (modMatch) {
      const num = getNumericValue(resolveValue(modMatch[1], data, visited));
      const divisor = getNumericValue(resolveValue(modMatch[2], data, visited));
      if (divisor === 0) return '#DIV/0!';
      return String(num % divisor);
    }

    // POWER(number, power)
    const powerMatch = expr.match(/^POWER\s*\(\s*(.+?)\s*,\s*(.+?)\s*\)$/i);
    if (powerMatch) {
      const base = getNumericValue(resolveValue(powerMatch[1], data, visited));
      const exp = getNumericValue(resolveValue(powerMatch[2], data, visited));
      return String(Math.pow(base, exp));
    }

    // QUOTIENT(numerator, denominator)
    const quotientMatch = expr.match(/^QUOTIENT\s*\(\s*(.+?)\s*,\s*(.+?)\s*\)$/i);
    if (quotientMatch) {
      const num = getNumericValue(resolveValue(quotientMatch[1], data, visited));
      const denom = getNumericValue(resolveValue(quotientMatch[2], data, visited));
      if (denom === 0) return '#DIV/0!';
      return String(Math.trunc(num / denom));
    }

    // SQRT(number)
    const sqrtMatch = expr.match(/^SQRT\s*\(\s*(.+?)\s*\)$/i);
    if (sqrtMatch) {
      const num = getNumericValue(resolveValue(sqrtMatch[1], data, visited));
      if (num < 0) return '#NUM!';
      return String(Math.round(Math.sqrt(num) * 100000) / 100000);
    }

    // RAND()
    if (expr.toUpperCase() === 'RAND()') {
      return String(Math.round(Math.random() * 100000) / 100000);
    }

    // RANDBETWEEN(bottom, top)
    const randBetweenMatch = expr.match(/^RANDBETWEEN\s*\(\s*(.+?)\s*,\s*(.+?)\s*\)$/i);
    if (randBetweenMatch) {
      const bottom = Math.ceil(getNumericValue(resolveValue(randBetweenMatch[1], data, visited)));
      const top = Math.floor(getNumericValue(resolveValue(randBetweenMatch[2], data, visited)));
      return String(Math.floor(Math.random() * (top - bottom + 1)) + bottom);
    }

    // ============ STATISTICAL FUNCTIONS ============
    // AVERAGE(range)
    const avgMatch = expr.match(/^AVERAGE\s*\(\s*([A-Z]+\d+:[A-Z]+\d+)\s*\)$/i);
    if (avgMatch) {
      const values = getRangeNumericValues(avgMatch[1].toUpperCase(), data, visited);
      if (values.length === 0) return '#DIV/0!';
      return String(Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100);
    }

    // AVERAGEIF(range, criteria, [average_range])
    const avgifMatch = expr.match(/^AVERAGEIF\s*\(\s*([A-Z]+\d+:[A-Z]+\d+)\s*,\s*(.+?)(?:\s*,\s*([A-Z]+\d+:[A-Z]+\d+))?\s*\)$/i);
    if (avgifMatch) {
      const criteriaRange = parseRange(avgifMatch[1].toUpperCase());
      const criteria = avgifMatch[2].trim().replace(/^["']|["']$/g, '');
      const avgRangeStr = avgifMatch[3]?.toUpperCase() || avgifMatch[1].toUpperCase();
      const avgRange = parseRange(avgRangeStr);
      if (!criteriaRange || !avgRange) return '#REF!';
      
      const values: number[] = [];
      let idx = 0;
      for (let r = criteriaRange[0]; r <= criteriaRange[2]; r++) {
        for (let c = criteriaRange[1]; c <= criteriaRange[3]; c++) {
          const cellVal = getCellValue(getCellId(r, c), data, visited);
          if (matchesCriteria(cellVal, criteria)) {
            const avgR = avgRange[0] + Math.floor(idx / (criteriaRange[3] - criteriaRange[1] + 1));
            const avgC = avgRange[1] + (idx % (criteriaRange[3] - criteriaRange[1] + 1));
            const v = getNumericValue(getCellValue(getCellId(avgR, avgC), data, visited));
            values.push(v);
          }
          idx++;
        }
      }
      if (values.length === 0) return '#DIV/0!';
      return String(Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100);
    }

    // COUNT(range)
    const countMatch = expr.match(/^COUNT\s*\(\s*([A-Z]+\d+:[A-Z]+\d+)\s*\)$/i);
    if (countMatch) {
      const values = getRangeValues(countMatch[1].toUpperCase(), data, visited);
      return String(values.filter(v => isNumeric(v)).length);
    }

    // COUNTA(range)
    const countaMatch = expr.match(/^COUNTA\s*\(\s*([A-Z]+\d+:[A-Z]+\d+)\s*\)$/i);
    if (countaMatch) {
      const values = getRangeValues(countaMatch[1].toUpperCase(), data, visited);
      return String(values.filter(v => v !== '').length);
    }

    // COUNTBLANK(range)
    const countblankMatch = expr.match(/^COUNTBLANK\s*\(\s*([A-Z]+\d+:[A-Z]+\d+)\s*\)$/i);
    if (countblankMatch) {
      const range = parseRange(countblankMatch[1].toUpperCase());
      if (!range) return '#REF!';
      let count = 0;
      for (let r = range[0]; r <= range[2]; r++) {
        for (let c = range[1]; c <= range[3]; c++) {
          const val = getCellValue(getCellId(r, c), data, visited);
          if (val === '') count++;
        }
      }
      return String(count);
    }

    // COUNTIF(range, criteria)
    const countifMatch = expr.match(/^COUNTIF\s*\(\s*([A-Z]+\d+:[A-Z]+\d+)\s*,\s*(.+?)\s*\)$/i);
    if (countifMatch) {
      const values = getRangeValues(countifMatch[1].toUpperCase(), data, visited);
      const criteria = countifMatch[2].trim().replace(/^["']|["']$/g, '');
      return String(values.filter(v => matchesCriteria(v, criteria)).length);
    }

    // MIN(range)
    const minMatch = expr.match(/^MIN\s*\(\s*([A-Z]+\d+:[A-Z]+\d+)\s*\)$/i);
    if (minMatch) {
      const values = getRangeNumericValues(minMatch[1].toUpperCase(), data, visited);
      if (values.length === 0) return '0';
      return String(Math.min(...values));
    }

    // MAX(range)
    const maxMatch = expr.match(/^MAX\s*\(\s*([A-Z]+\d+:[A-Z]+\d+)\s*\)$/i);
    if (maxMatch) {
      const values = getRangeNumericValues(maxMatch[1].toUpperCase(), data, visited);
      if (values.length === 0) return '0';
      return String(Math.max(...values));
    }

    // MEDIAN(range)
    const medianMatch = expr.match(/^MEDIAN\s*\(\s*([A-Z]+\d+:[A-Z]+\d+)\s*\)$/i);
    if (medianMatch) {
      const values = getRangeNumericValues(medianMatch[1].toUpperCase(), data, visited).sort((a, b) => a - b);
      if (values.length === 0) return '#NUM!';
      const mid = Math.floor(values.length / 2);
      return values.length % 2 !== 0 ? String(values[mid]) : String((values[mid - 1] + values[mid]) / 2);
    }

    // MODE.SNGL(range)
    const modeMatch = expr.match(/^MODE\.SNGL\s*\(\s*([A-Z]+\d+:[A-Z]+\d+)\s*\)$/i);
    if (modeMatch) {
      const values = getRangeNumericValues(modeMatch[1].toUpperCase(), data, visited);
      if (values.length === 0) return '#N/A';
      const freq: Record<number, number> = {};
      values.forEach(v => { freq[v] = (freq[v] || 0) + 1; });
      let mode = values[0], maxFreq = 0;
      Object.entries(freq).forEach(([k, v]) => {
        if (v > maxFreq) { maxFreq = v; mode = parseFloat(k); }
      });
      return maxFreq > 1 ? String(mode) : '#N/A';
    }

    // LARGE(range, k)
    const largeMatch = expr.match(/^LARGE\s*\(\s*([A-Z]+\d+:[A-Z]+\d+)\s*,\s*(.+?)\s*\)$/i);
    if (largeMatch) {
      const values = getRangeNumericValues(largeMatch[1].toUpperCase(), data, visited).sort((a, b) => b - a);
      const k = Math.floor(getNumericValue(resolveValue(largeMatch[2], data, visited)));
      if (k < 1 || k > values.length) return '#NUM!';
      return String(values[k - 1]);
    }

    // SMALL(range, k)
    const smallMatch = expr.match(/^SMALL\s*\(\s*([A-Z]+\d+:[A-Z]+\d+)\s*,\s*(.+?)\s*\)$/i);
    if (smallMatch) {
      const values = getRangeNumericValues(smallMatch[1].toUpperCase(), data, visited).sort((a, b) => a - b);
      const k = Math.floor(getNumericValue(resolveValue(smallMatch[2], data, visited)));
      if (k < 1 || k > values.length) return '#NUM!';
      return String(values[k - 1]);
    }

    // RANK.EQ(number, range, [order])
    const rankMatch = expr.match(/^RANK\.EQ\s*\(\s*(.+?)\s*,\s*([A-Z]+\d+:[A-Z]+\d+)(?:\s*,\s*(\d))?\s*\)$/i);
    if (rankMatch) {
      const num = getNumericValue(resolveValue(rankMatch[1], data, visited));
      const values = getRangeNumericValues(rankMatch[2].toUpperCase(), data, visited);
      const order = rankMatch[3] ? parseInt(rankMatch[3]) : 0;
      const sorted = order === 0 ? values.sort((a, b) => b - a) : values.sort((a, b) => a - b);
      const rank = sorted.indexOf(num) + 1;
      return rank > 0 ? String(rank) : '#N/A';
    }

    // ============ TEXT FUNCTIONS ============
    // CONCAT(text1, text2, ...)
    const concatMatch = expr.match(/^CONCAT\s*\(\s*(.+)\s*\)$/i);
    if (concatMatch) {
      const args = splitArgs(concatMatch[1]);
      return args.map(a => resolveValue(a.trim(), data, visited).replace(/^["']|["']$/g, '')).join('');
    }

    // LEN(text)
    const lenMatch = expr.match(/^LEN\s*\(\s*(.+?)\s*\)$/i);
    if (lenMatch) {
      const text = resolveValue(lenMatch[1], data, visited).replace(/^["']|["']$/g, '');
      return String(text.length);
    }

    // LEFT(text, num_chars)
    const leftMatch = expr.match(/^LEFT\s*\(\s*(.+?)\s*,\s*(\d+)\s*\)$/i);
    if (leftMatch) {
      const text = resolveValue(leftMatch[1], data, visited).replace(/^["']|["']$/g, '');
      const num = parseInt(leftMatch[2]);
      return text.substring(0, num);
    }

    // RIGHT(text, num_chars)
    const rightMatch = expr.match(/^RIGHT\s*\(\s*(.+?)\s*,\s*(\d+)\s*\)$/i);
    if (rightMatch) {
      const text = resolveValue(rightMatch[1], data, visited).replace(/^["']|["']$/g, '');
      const num = parseInt(rightMatch[2]);
      return text.substring(text.length - num);
    }

    // MID(text, start, num_chars)
    const midMatch = expr.match(/^MID\s*\(\s*(.+?)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i);
    if (midMatch) {
      const text = resolveValue(midMatch[1], data, visited).replace(/^["']|["']$/g, '');
      const start = parseInt(midMatch[2]) - 1;
      const num = parseInt(midMatch[3]);
      return text.substring(start, start + num);
    }

    // FIND(find_text, within_text, [start_num])
    const findMatch = expr.match(/^FIND\s*\(\s*(.+?)\s*,\s*(.+?)(?:\s*,\s*(\d+))?\s*\)$/i);
    if (findMatch) {
      const findText = resolveValue(findMatch[1], data, visited).replace(/^["']|["']$/g, '');
      const withinText = resolveValue(findMatch[2], data, visited).replace(/^["']|["']$/g, '');
      const start = findMatch[3] ? parseInt(findMatch[3]) - 1 : 0;
      const pos = withinText.indexOf(findText, start);
      return pos >= 0 ? String(pos + 1) : '#VALUE!';
    }

    // SEARCH(find_text, within_text, [start_num]) - case insensitive
    const searchMatch = expr.match(/^SEARCH\s*\(\s*(.+?)\s*,\s*(.+?)(?:\s*,\s*(\d+))?\s*\)$/i);
    if (searchMatch) {
      const findText = resolveValue(searchMatch[1], data, visited).replace(/^["']|["']$/g, '').toLowerCase();
      const withinText = resolveValue(searchMatch[2], data, visited).replace(/^["']|["']$/g, '').toLowerCase();
      const start = searchMatch[3] ? parseInt(searchMatch[3]) - 1 : 0;
      const pos = withinText.indexOf(findText, start);
      return pos >= 0 ? String(pos + 1) : '#VALUE!';
    }

    // ============ LOOKUP FUNCTIONS ============
    // VLOOKUP(lookup_value, table_array, col_index, [range_lookup])
    const vlookupMatch = expr.match(/^VLOOKUP\s*\(\s*(.+?)\s*,\s*([A-Z]+\d+:[A-Z]+\d+)\s*,\s*(\d+)(?:\s*,\s*(TRUE|FALSE|0|1))?\s*\)$/i);
    if (vlookupMatch) {
      const lookupVal = resolveValue(vlookupMatch[1], data, visited).replace(/^["']|["']$/g, '');
      const tableRange = parseRange(vlookupMatch[2].toUpperCase());
      const colIndex = parseInt(vlookupMatch[3]);
      const exactMatch = vlookupMatch[4]?.toUpperCase() === 'FALSE' || vlookupMatch[4] === '0';
      
      if (!tableRange) return '#REF!';
      if (colIndex < 1 || colIndex > (tableRange[3] - tableRange[1] + 1)) return '#REF!';
      
      for (let r = tableRange[0]; r <= tableRange[2]; r++) {
        const cellVal = getCellValue(getCellId(r, tableRange[1]), data, visited);
        if (exactMatch ? cellVal === lookupVal : cellVal.toString().startsWith(lookupVal.toString())) {
          return getCellValue(getCellId(r, tableRange[1] + colIndex - 1), data, visited);
        }
      }
      return '#N/A';
    }

    // HLOOKUP(lookup_value, table_array, row_index, [range_lookup])
    const hlookupMatch = expr.match(/^HLOOKUP\s*\(\s*(.+?)\s*,\s*([A-Z]+\d+:[A-Z]+\d+)\s*,\s*(\d+)(?:\s*,\s*(TRUE|FALSE|0|1))?\s*\)$/i);
    if (hlookupMatch) {
      const lookupVal = resolveValue(hlookupMatch[1], data, visited).replace(/^["']|["']$/g, '');
      const tableRange = parseRange(hlookupMatch[2].toUpperCase());
      const rowIndex = parseInt(hlookupMatch[3]);
      const exactMatch = hlookupMatch[4]?.toUpperCase() === 'FALSE' || hlookupMatch[4] === '0';
      
      if (!tableRange) return '#REF!';
      if (rowIndex < 1 || rowIndex > (tableRange[2] - tableRange[0] + 1)) return '#REF!';
      
      for (let c = tableRange[1]; c <= tableRange[3]; c++) {
        const cellVal = getCellValue(getCellId(tableRange[0], c), data, visited);
        if (exactMatch ? cellVal === lookupVal : cellVal.toString().startsWith(lookupVal.toString())) {
          return getCellValue(getCellId(tableRange[0] + rowIndex - 1, c), data, visited);
        }
      }
      return '#N/A';
    }

    // INDEX(array, row_num, [col_num])
    const indexMatch = expr.match(/^INDEX\s*\(\s*([A-Z]+\d+:[A-Z]+\d+)\s*,\s*(\d+)(?:\s*,\s*(\d+))?\s*\)$/i);
    if (indexMatch) {
      const range = parseRange(indexMatch[1].toUpperCase());
      const rowNum = parseInt(indexMatch[2]);
      const colNum = indexMatch[3] ? parseInt(indexMatch[3]) : 1;
      if (!range) return '#REF!';
      const targetRow = range[0] + rowNum - 1;
      const targetCol = range[1] + colNum - 1;
      if (targetRow > range[2] || targetCol > range[3]) return '#REF!';
      return getCellValue(getCellId(targetRow, targetCol), data, visited);
    }

    // MATCH(lookup_value, lookup_array, [match_type])
    const matchMatch = expr.match(/^MATCH\s*\(\s*(.+?)\s*,\s*([A-Z]+\d+:[A-Z]+\d+)(?:\s*,\s*(-?[01]))?\s*\)$/i);
    if (matchMatch) {
      const lookupVal = resolveValue(matchMatch[1], data, visited).replace(/^["']|["']$/g, '');
      const range = parseRange(matchMatch[2].toUpperCase());
      const matchType = matchMatch[3] ? parseInt(matchMatch[3]) : 1;
      if (!range) return '#REF!';
      
      const values = getRangeValues(matchMatch[2].toUpperCase(), data, visited);
      
      if (matchType === 0) {
        const idx = values.findIndex(v => v === lookupVal);
        return idx >= 0 ? String(idx + 1) : '#N/A';
      }
      const idx = values.findIndex(v => v === lookupVal);
      return idx >= 0 ? String(idx + 1) : '#N/A';
    }

    // ============ ARITHMETIC WITH CELL REFERENCES & OPERATORS ============
    // Handle & (concatenation)
    if (expr.includes('&')) {
      const parts = expr.split('&');
      return parts.map(p => resolveValue(p.trim(), data, visited).replace(/^["']|["']$/g, '')).join('');
    }

    // Replace cell references with values (including absolute/mixed refs with $)
    let evalExpr = expr.toUpperCase();
    const cellRefs = evalExpr.match(/\$?[A-Z]+\$?\d+/g) || [];
    for (const ref of cellRefs) {
      const pos = parseCellRef(ref);
      if (pos) {
        const id = getCellId(pos[0], pos[1]);
        if (visited.has(id)) return '#CIRC!';
        const newVisited = new Set(Array.from(visited));
        newVisited.add(id);
        const cellVal = data[id]?.value || '0';
        const resolved = cellVal.startsWith('=') ? evaluateFormula(cellVal, data, newVisited) : cellVal;
        // Escape $ signs in regex replacement
        const escapedRef = ref.replace(/\$/g, '\\$');
        evalExpr = evalExpr.replace(new RegExp(escapedRef, 'g'), getNumericValue(resolved).toString());
      }
    }

    // Handle % operator
    evalExpr = evalExpr.replace(/(\d+(?:\.\d+)?)\s*%/g, '($1/100)');
    
    // Handle ^ (exponentiation)
    evalExpr = evalExpr.replace(/\^/g, '**');

    // Safe eval for basic math
    if (/^[\d\s+\-*/().%*]+$/.test(evalExpr)) {
      const result = Function('"use strict"; return (' + evalExpr + ')')();
      return String(Math.round(result * 100000) / 100000);
    }

    return formula;
  } catch (e) {
    return '#ERROR!';
  }
};

// Helper: resolve a value (cell ref or literal) - handles $A$1, $A1, A$1 formats
const resolveValue = (val: string, data: SheetData, visited: Set<string>): string => {
  const trimmed = val.trim().toUpperCase();
  // Check if it looks like a cell reference (with or without $ signs)
  if (/^\$?[A-Z]+\$?\d+$/.test(trimmed)) {
    const ref = parseCellRef(trimmed);
    if (ref) {
      return getCellValue(getCellId(ref[0], ref[1]), data, visited);
    }
  }
  return val.trim();
};

// Helper: evaluate a condition
const evaluateCondition = (cond: string, data: SheetData, visited: Set<string>): boolean => {
  const trimmed = cond.trim();
  
  const compMatch = trimmed.match(/^(.+?)\s*(>=|<=|<>|>|<|=)\s*(.+)$/);
  if (compMatch) {
    const left = resolveValue(compMatch[1], data, visited);
    const op = compMatch[2];
    const right = resolveValue(compMatch[3], data, visited).replace(/^["']|["']$/g, '');
    
    const leftNum = parseFloat(left);
    const rightNum = parseFloat(right);
    const useNumeric = !isNaN(leftNum) && !isNaN(rightNum);
    
    switch (op) {
      case '=': return useNumeric ? leftNum === rightNum : left === right;
      case '<>': return useNumeric ? leftNum !== rightNum : left !== right;
      case '>': return useNumeric ? leftNum > rightNum : left > right;
      case '<': return useNumeric ? leftNum < rightNum : left < right;
      case '>=': return useNumeric ? leftNum >= rightNum : left >= right;
      case '<=': return useNumeric ? leftNum <= rightNum : left <= right;
    }
  }
  
  if (trimmed.toUpperCase() === 'TRUE') return true;
  if (trimmed.toUpperCase() === 'FALSE') return false;
  
  const val = resolveValue(trimmed, data, visited);
  return val !== '' && val !== '0' && val.toUpperCase() !== 'FALSE';
};

// Helper: check if value matches criteria
const matchesCriteria = (value: string, criteria: string): boolean => {
  if (criteria.startsWith('>=')) return parseFloat(value) >= parseFloat(criteria.slice(2));
  if (criteria.startsWith('<=')) return parseFloat(value) <= parseFloat(criteria.slice(2));
  if (criteria.startsWith('<>')) return value !== criteria.slice(2);
  if (criteria.startsWith('>')) return parseFloat(value) > parseFloat(criteria.slice(1));
  if (criteria.startsWith('<')) return parseFloat(value) < parseFloat(criteria.slice(1));
  if (criteria.startsWith('=')) return value === criteria.slice(1);
  
  if (criteria.includes('*') || criteria.includes('?')) {
    const regex = new RegExp('^' + criteria.replace(/\*/g, '.*').replace(/\?/g, '.') + '$', 'i');
    return regex.test(value);
  }
  
  return value.toLowerCase() === criteria.toLowerCase();
};

// Helper: split function arguments
const splitArgs = (str: string): string[] => {
  const args: string[] = [];
  let depth = 0;
  let current = '';
  for (const char of str) {
    if (char === '(') depth++;
    else if (char === ')') depth--;
    else if (char === ',' && depth === 0) {
      args.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  if (current.trim()) args.push(current.trim());
  return args;
};

// ============================================
// TEMPLATES - Comprehensive 7155 Syllabus Coverage
// ============================================
const spreadsheetTemplates: { name: string; description: string; category: string; data: SheetData }[] = [
  // =============================================
  // 3.1.1 CELL REFERENCES (Relative, Absolute, Mixed)
  // =============================================
  {
    name: '3.1.1 Cell References Demo',
    description: 'Relative (A1), Absolute ($A$1), Mixed (A$1, $A1)',
    category: '3.1.1 References',
    data: {
      'A1': { value: '--- CELL REFERENCES ---' },
      'A2': { value: 'Base Value:' }, 'B2': { value: '10' },
      'A3': { value: 'Multiplier:' }, 'B3': { value: '2' },
      'A5': { value: 'Type' }, 'B5': { value: 'Formula (text)' }, 'C5': { value: 'Result' }, 'D5': { value: 'Explanation' },
      'A6': { value: 'Relative' }, 'B6': { value: 'B2*B3' }, 'C6': { value: '=B2*B3' }, 'D6': { value: 'Both adjust when copied' },
      'A7': { value: 'Absolute' }, 'B7': { value: '$B$2*$B$3' }, 'C7': { value: '=$B$2*$B$3' }, 'D7': { value: 'Neither adjusts when copied' },
      'A8': { value: 'Mixed Col' }, 'B8': { value: '$B2*B3' }, 'C8': { value: '=$B2*B3' }, 'D8': { value: 'Column B stays fixed' },
      'A9': { value: 'Mixed Row' }, 'B9': { value: 'B$2*B3' }, 'C9': { value: '=B$2*B3' }, 'D9': { value: 'Row 2 stays fixed' },
      'A11': { value: '>>> Try copying C6:C9 down to see how formulas adjust!' },
      'A12': { value: '>>> Click a cell to see its formula in the formula bar above' },
    },
  },
  {
    name: '3.1.1 Multiplication Table',
    description: 'Practice absolute & mixed references',
    category: '3.1.1 References',
    data: {
      'A1': { value: 'X' }, 'B1': { value: '1' }, 'C1': { value: '2' }, 'D1': { value: '3' }, 'E1': { value: '4' }, 'F1': { value: '5' },
      'A2': { value: '1' }, 'B2': { value: '=$A2*B$1' },
      'A3': { value: '2' },
      'A4': { value: '3' },
      'A5': { value: '4' },
      'A6': { value: '5' },
      'H1': { value: 'Instructions:' },
      'H2': { value: '1. B2 has formula =$A2*B$1' },
      'H3': { value: '2. Select B2' },
      'H4': { value: '3. Drag right to F2' },
      'H5': { value: '4. Then drag down to F6' },
      'H6': { value: '5. Watch how mixed refs work!' },
    },
  },
  {
    name: '3.1.1 Drag Fill Practice',
    description: 'Practice copying formulas with drag',
    category: '3.1.1 References',
    data: {
      'A1': { value: 'Number' }, 'B1': { value: 'Square' }, 'C1': { value: 'Double' }, 'D1': { value: 'Cube' },
      'A2': { value: '1' }, 'B2': { value: '=A2^2' }, 'C2': { value: '=A2*2' }, 'D2': { value: '=A2^3' },
      'A3': { value: '2' },
      'A4': { value: '3' },
      'A5': { value: '4' },
      'A6': { value: '5' },
      'F2': { value: 'Instructions:' },
      'F3': { value: '1. Select B2:D2' },
      'F4': { value: '2. Drag blue handle down to row 6' },
      'F5': { value: '3. Watch formulas auto-adjust!' },
      'F7': { value: '>>> Each formula changes its row reference' },
    },
  },
  // =============================================
  // 3.1.2 GOAL SEEK (What-If Analysis)
  // =============================================
  {
    name: '3.1.2 Goal Seek Practice',
    description: 'What-If Analysis: Find input for target',
    category: '3.1.2 Goal Seek',
    data: {
      'A1': { value: '--- GOAL SEEK PRACTICE ---' },
      'A3': { value: 'Loan Amount:' }, 'B3': { value: '10000' },
      'A4': { value: 'Interest Rate:' }, 'B4': { value: '0.05' },
      'A5': { value: 'Years:' }, 'B5': { value: '5' },
      'A6': { value: 'Total Interest:' }, 'B6': { value: '=B3*B4*B5' },
      'A8': { value: '>>> Click GOAL SEEK button above' },
      'A9': { value: '>>> Try: Set B6 to 2000, changing B4' },
      'A10': { value: '>>> This finds what interest rate gives $2000 interest' },
      'D3': { value: 'Example 2:' },
      'D4': { value: 'Price:' }, 'E4': { value: '50' },
      'D5': { value: 'Quantity:' }, 'E5': { value: '100' },
      'D6': { value: 'Revenue:' }, 'E6': { value: '=E4*E5' },
      'D8': { value: '>>> Set E6 to 6000, changing E5' },
      'D9': { value: '>>> Finds quantity for $6000 revenue' },
    },
  },
  // =============================================
  // 3.1.3 CONDITIONAL FORMATTING
  // =============================================
  {
    name: '3.1.3 Conditional Formatting',
    description: 'Color cells based on values',
    category: '3.1.3 Cond. Format',
    data: {
      'A1': { value: '--- CONDITIONAL FORMATTING ---' },
      'A3': { value: 'Student' }, 'B3': { value: 'Score' }, 'C3': { value: 'Status' },
      'A4': { value: 'Alice' }, 'B4': { value: '85' }, 'C4': { value: 'Pass' },
      'A5': { value: 'Bob' }, 'B5': { value: '45' }, 'C5': { value: 'Fail' },
      'A6': { value: 'Charlie' }, 'B6': { value: '72' }, 'C6': { value: 'Pass' },
      'A7': { value: 'Diana' }, 'B7': { value: '38' }, 'C7': { value: 'Fail' },
      'A8': { value: 'Eve' }, 'B8': { value: '91' }, 'C8': { value: 'Pass' },
      'E3': { value: 'Try this:' },
      'E4': { value: '1. Click "Cond. Format" button above' },
      'E5': { value: '2. Set range: B4:B8' },
      'E6': { value: '3. Condition: Greater than 50' },
      'E7': { value: '4. Pick green background' },
      'E8': { value: '5. Click Add Rule' },
      'E10': { value: '6. Add another rule:' },
      'E11': { value: '   Range: B4:B8, Less than 50, Red' },
      'E13': { value: '>>> Scores will be colored automatically!' },
    },
  },
  // =============================================
  // 3.2.1 LOGICAL FUNCTIONS (IF, AND, OR, NOT)
  // =============================================
  {
    name: '3.2.1 Logical Functions',
    description: 'IF, AND, OR, NOT operators',
    category: '3.2.1 Logical',
    data: {
      'A1': { value: 'Student' }, 'B1': { value: 'Math' }, 'C1': { value: 'English' }, 'D1': { value: 'Pass Both?' }, 'E1': { value: 'Pass Any?' }, 'F1': { value: 'Grade' },
      'A2': { value: 'Alice' }, 'B2': { value: '85' }, 'C2': { value: '72' }, 'D2': { value: '=IF(AND(B2>=50,C2>=50),"Yes","No")' }, 'E2': { value: '=IF(OR(B2>=50,C2>=50),"Yes","No")' }, 'F2': { value: '=IF(B2>=80,"A",IF(B2>=60,"B","C"))' },
      'A3': { value: 'Bob' }, 'B3': { value: '45' }, 'C3': { value: '55' }, 'D3': { value: '=IF(AND(B3>=50,C3>=50),"Yes","No")' }, 'E3': { value: '=IF(OR(B3>=50,C3>=50),"Yes","No")' }, 'F3': { value: '=IF(B3>=80,"A",IF(B3>=60,"B","C"))' },
      'A4': { value: 'Charlie' }, 'B4': { value: '40' }, 'C4': { value: '35' }, 'D4': { value: '=IF(AND(B4>=50,C4>=50),"Yes","No")' }, 'E4': { value: '=IF(OR(B4>=50,C4>=50),"Yes","No")' }, 'F4': { value: '=IF(B4>=80,"A",IF(B4>=60,"B","C"))' },
      'A6': { value: 'NOT Example:' }, 'B6': { value: '=NOT(B2>=50)' }, 'C6': { value: '(Is Alice NOT passing Math?)' },
    },
  },
  // =============================================
  // 3.2.2 MATHEMATICAL & STATISTICAL FUNCTIONS
  // =============================================
  {
    name: '3.2.2a Basic Math Operations',
    description: 'Add, Subtract, Multiply, Divide, Power, Mod',
    category: '3.2.2 Math',
    data: {
      'A1': { value: '--- BASIC MATH OPERATIONS ---' },
      'A2': { value: 'Value A:' }, 'B2': { value: '20' },
      'A3': { value: 'Value B:' }, 'B3': { value: '6' },
      'A5': { value: 'Operation' }, 'B5': { value: 'Formula' }, 'C5': { value: 'Result' },
      'A6': { value: 'Addition' }, 'B6': { value: 'B2+B3' }, 'C6': { value: '=B2+B3' },
      'A7': { value: 'Subtraction' }, 'B7': { value: 'B2-B3' }, 'C7': { value: '=B2-B3' },
      'A8': { value: 'Multiplication' }, 'B8': { value: 'B2*B3' }, 'C8': { value: '=B2*B3' },
      'A9': { value: 'Division' }, 'B9': { value: 'B2/B3' }, 'C9': { value: '=B2/B3' },
      'A10': { value: 'Exponent (Power)' }, 'B10': { value: 'B2^2' }, 'C10': { value: '=B2^2' },
      'A11': { value: 'Modulo' }, 'B11': { value: 'MOD(B2,B3)' }, 'C11': { value: '=MOD(B2,B3)' },
      'A12': { value: 'Square Root' }, 'B12': { value: 'SQRT(B2)' }, 'C12': { value: '=SQRT(B2)' },
    },
  },
  {
    name: '3.2.2b Rounding Functions',
    description: 'ROUND, ROUNDUP, ROUNDDOWN',
    category: '3.2.2 Math',
    data: {
      'A1': { value: 'Number' }, 'B1': { value: '3.14159' },
      'A3': { value: 'Function' }, 'B3': { value: 'Formula' }, 'C3': { value: 'Result' }, 'D3': { value: 'Description' },
      'A4': { value: 'ROUND' }, 'B4': { value: 'ROUND(B1,2)' }, 'C4': { value: '=ROUND(B1,2)' }, 'D4': { value: 'Round to 2 decimals' },
      'A5': { value: 'ROUNDUP' }, 'B5': { value: 'ROUNDUP(B1,2)' }, 'C5': { value: '=ROUNDUP(B1,2)' }, 'D5': { value: 'Always round up' },
      'A6': { value: 'ROUNDDOWN' }, 'B6': { value: 'ROUNDDOWN(B1,2)' }, 'C6': { value: '=ROUNDDOWN(B1,2)' }, 'D6': { value: 'Always round down' },
      'A7': { value: 'CEILING' }, 'B7': { value: 'CEILING.MATH(B1,1)' }, 'C7': { value: '=CEILING.MATH(B1,1)' }, 'D7': { value: 'Round up to nearest 1' },
      'A8': { value: 'FLOOR' }, 'B8': { value: 'FLOOR.MATH(B1,1)' }, 'C8': { value: '=FLOOR.MATH(B1,1)' }, 'D8': { value: 'Round down to nearest 1' },
    },
  },
  {
    name: '3.2.2c SUM & AVERAGE',
    description: 'SUM, SUMIF, AVERAGE, AVERAGEIF',
    category: '3.2.2 Stats',
    data: {
      'A1': { value: 'Product' }, 'B1': { value: 'Category' }, 'C1': { value: 'Sales' },
      'A2': { value: 'Laptop' }, 'B2': { value: 'Electronics' }, 'C2': { value: '1200' },
      'A3': { value: 'Phone' }, 'B3': { value: 'Electronics' }, 'C3': { value: '800' },
      'A4': { value: 'Desk' }, 'B4': { value: 'Furniture' }, 'C4': { value: '300' },
      'A5': { value: 'Chair' }, 'B5': { value: 'Furniture' }, 'C5': { value: '150' },
      'A6': { value: 'Tablet' }, 'B6': { value: 'Electronics' }, 'C6': { value: '500' },
      'E1': { value: 'Function' }, 'F1': { value: 'Result' },
      'E2': { value: 'Total SUM:' }, 'F2': { value: '=SUM(C2:C6)' },
      'E3': { value: 'AVERAGE:' }, 'F3': { value: '=AVERAGE(C2:C6)' },
      'E4': { value: 'Electronics SUM:' }, 'F4': { value: '=SUMIF(B2:B6,"Electronics",C2:C6)' },
      'E5': { value: 'Electronics AVG:' }, 'F5': { value: '=AVERAGEIF(B2:B6,"Electronics",C2:C6)' },
      'E6': { value: 'Sales > 500:' }, 'F6': { value: '=SUMIF(C2:C6,">500")' },
    },
  },
  {
    name: '3.2.2d MEDIAN, MODE, MIN, MAX',
    description: 'Central tendency and extremes',
    category: '3.2.2 Stats',
    data: {
      'A1': { value: 'Student' }, 'B1': { value: 'Score' },
      'A2': { value: 'Alice' }, 'B2': { value: '85' },
      'A3': { value: 'Bob' }, 'B3': { value: '72' },
      'A4': { value: 'Charlie' }, 'B4': { value: '91' },
      'A5': { value: 'Diana' }, 'B5': { value: '68' },
      'A6': { value: 'Eve' }, 'B6': { value: '72' },
      'D1': { value: 'Function' }, 'E1': { value: 'Formula' }, 'F1': { value: 'Result' },
      'D2': { value: 'MIN' }, 'E2': { value: 'MIN(B2:B6)' }, 'F2': { value: '=MIN(B2:B6)' },
      'D3': { value: 'MAX' }, 'E3': { value: 'MAX(B2:B6)' }, 'F3': { value: '=MAX(B2:B6)' },
      'D4': { value: 'MEDIAN' }, 'E4': { value: 'MEDIAN(B2:B6)' }, 'F4': { value: '=MEDIAN(B2:B6)' },
      'D5': { value: 'MODE.SNGL' }, 'E5': { value: 'MODE.SNGL(B2:B6)' }, 'F5': { value: '=MODE.SNGL(B2:B6)' },
      'D7': { value: '>>> MODE returns 72 (appears twice)' },
    },
  },
  {
    name: '3.2.2e RANK, LARGE, SMALL',
    description: 'Ranking and n-th values',
    category: '3.2.2 Stats',
    data: {
      'A1': { value: 'Student' }, 'B1': { value: 'Score' }, 'C1': { value: 'Rank (Desc)' }, 'D1': { value: 'Rank (Asc)' },
      'A2': { value: 'Alice' }, 'B2': { value: '85' }, 'C2': { value: '=RANK.EQ(B2,B2:B6,0)' }, 'D2': { value: '=RANK.EQ(B2,B2:B6,1)' },
      'A3': { value: 'Bob' }, 'B3': { value: '72' }, 'C3': { value: '=RANK.EQ(B3,B2:B6,0)' }, 'D3': { value: '=RANK.EQ(B3,B2:B6,1)' },
      'A4': { value: 'Charlie' }, 'B4': { value: '91' }, 'C4': { value: '=RANK.EQ(B4,B2:B6,0)' }, 'D4': { value: '=RANK.EQ(B4,B2:B6,1)' },
      'A5': { value: 'Diana' }, 'B5': { value: '68' }, 'C5': { value: '=RANK.EQ(B5,B2:B6,0)' }, 'D5': { value: '=RANK.EQ(B5,B2:B6,1)' },
      'A6': { value: 'Eve' }, 'B6': { value: '95' }, 'C6': { value: '=RANK.EQ(B6,B2:B6,0)' }, 'D6': { value: '=RANK.EQ(B6,B2:B6,1)' },
      'F1': { value: 'n-th Values' },
      'F2': { value: '1st Largest:' }, 'G2': { value: '=LARGE(B2:B6,1)' },
      'F3': { value: '2nd Largest:' }, 'G3': { value: '=LARGE(B2:B6,2)' },
      'F4': { value: '1st Smallest:' }, 'G4': { value: '=SMALL(B2:B6,1)' },
      'F5': { value: '2nd Smallest:' }, 'G5': { value: '=SMALL(B2:B6,2)' },
    },
  },
  {
    name: '3.2.2f Counting Functions',
    description: 'COUNT, COUNTA, COUNTBLANK, COUNTIF',
    category: '3.2.2 Stats',
    data: {
      'A1': { value: 'Data' }, 'B1': { value: '10' },
      'A2': { value: '' }, 'B2': { value: '20' },
      'A3': { value: 'Text' }, 'B3': { value: '' },
      'A4': { value: '5' }, 'B4': { value: '30' },
      'A5': { value: '' }, 'B5': { value: '20' },
      'D1': { value: 'Function' }, 'E1': { value: 'Range' }, 'F1': { value: 'Result' }, 'G1': { value: 'Description' },
      'D2': { value: 'COUNT' }, 'E2': { value: 'A1:A5' }, 'F2': { value: '=COUNT(A1:A5)' }, 'G2': { value: 'Numbers only' },
      'D3': { value: 'COUNTA' }, 'E3': { value: 'A1:A5' }, 'F3': { value: '=COUNTA(A1:A5)' }, 'G3': { value: 'Non-empty cells' },
      'D4': { value: 'COUNTBLANK' }, 'E4': { value: 'A1:A5' }, 'F4': { value: '=COUNTBLANK(A1:A5)' }, 'G4': { value: 'Empty cells' },
      'D5': { value: 'COUNTIF' }, 'E5': { value: 'B1:B5, 20' }, 'F5': { value: '=COUNTIF(B1:B5,20)' }, 'G5': { value: 'Cells = 20' },
      'D6': { value: 'COUNTIF' }, 'E6': { value: 'B1:B5, >15' }, 'F6': { value: '=COUNTIF(B1:B5,">15")' }, 'G6': { value: 'Cells > 15' },
    },
  },
  {
    name: '3.2.2g Random Numbers',
    description: 'RAND, RANDBETWEEN',
    category: '3.2.2 Math',
    data: {
      'A1': { value: '--- RANDOM NUMBERS ---' },
      'A3': { value: 'Function' }, 'B3': { value: 'Formula' }, 'C3': { value: 'Result' }, 'D3': { value: 'Description' },
      'A4': { value: 'RAND' }, 'B4': { value: 'RAND()' }, 'C4': { value: '=RAND()' }, 'D4': { value: 'Random 0-1' },
      'A5': { value: 'RANDBETWEEN' }, 'B5': { value: 'RANDBETWEEN(1,100)' }, 'C5': { value: '=RANDBETWEEN(1,100)' }, 'D5': { value: 'Random 1-100' },
      'A6': { value: 'Dice Roll' }, 'B6': { value: 'RANDBETWEEN(1,6)' }, 'C6': { value: '=RANDBETWEEN(1,6)' }, 'D6': { value: 'Random 1-6' },
      'A8': { value: '>>> Edit any cell to regenerate random numbers' },
    },
  },
  // =============================================
  // 3.2.3 TEXT FUNCTIONS
  // =============================================
  {
    name: '3.2.3 Text Functions',
    description: 'LEFT, RIGHT, MID, LEN, CONCAT, FIND, SEARCH',
    category: '3.2.3 Text',
    data: {
      'A1': { value: 'Full Name' }, 'B1': { value: 'John Smith' },
      'A2': { value: 'Email' }, 'B2': { value: 'john@example.com' },
      'A4': { value: 'Function' }, 'B4': { value: 'Formula' }, 'C4': { value: 'Result' }, 'D4': { value: 'Description' },
      'A5': { value: 'LEFT' }, 'B5': { value: 'LEFT(B1,4)' }, 'C5': { value: '=LEFT(B1,4)' }, 'D5': { value: 'First 4 chars' },
      'A6': { value: 'RIGHT' }, 'B6': { value: 'RIGHT(B1,5)' }, 'C6': { value: '=RIGHT(B1,5)' }, 'D6': { value: 'Last 5 chars' },
      'A7': { value: 'MID' }, 'B7': { value: 'MID(B1,6,5)' }, 'C7': { value: '=MID(B1,6,5)' }, 'D7': { value: 'From pos 6, 5 chars' },
      'A8': { value: 'LEN' }, 'B8': { value: 'LEN(B1)' }, 'C8': { value: '=LEN(B1)' }, 'D8': { value: 'Text length' },
      'A9': { value: 'CONCAT' }, 'B9': { value: 'CONCAT(B1," - ",B2)' }, 'C9': { value: '=CONCAT(B1," - ",B2)' }, 'D9': { value: 'Join texts' },
      'A10': { value: 'FIND' }, 'B10': { value: 'FIND("@",B2)' }, 'C10': { value: '=FIND("@",B2)' }, 'D10': { value: 'Case-sensitive position' },
      'A11': { value: 'SEARCH' }, 'B11': { value: 'SEARCH("JOHN",B1)' }, 'C11': { value: '=SEARCH("JOHN",B1)' }, 'D11': { value: 'Case-insensitive position' },
    },
  },
  // =============================================
  // 3.2.4 LOOKUP FUNCTIONS
  // =============================================
  {
    name: '3.2.4a VLOOKUP (Exact Match)',
    description: 'Vertical lookup - unsorted table',
    category: '3.2.4 Lookup',
    data: {
      'A1': { value: 'ID' }, 'B1': { value: 'Name' }, 'C1': { value: 'Dept' }, 'D1': { value: 'Salary' },
      'A2': { value: '101' }, 'B2': { value: 'Alice' }, 'C2': { value: 'IT' }, 'D2': { value: '5000' },
      'A3': { value: '102' }, 'B3': { value: 'Bob' }, 'C3': { value: 'HR' }, 'D3': { value: '4500' },
      'A4': { value: '103' }, 'B4': { value: 'Charlie' }, 'C4': { value: 'IT' }, 'D4': { value: '5500' },
      'A5': { value: '104' }, 'B5': { value: 'Diana' }, 'C5': { value: 'Sales' }, 'D5': { value: '4800' },
      'F1': { value: 'Lookup ID:' }, 'G1': { value: '102' },
      'F2': { value: 'Name:' }, 'G2': { value: '=VLOOKUP(G1,A2:D5,2,FALSE)' },
      'F3': { value: 'Department:' }, 'G3': { value: '=VLOOKUP(G1,A2:D5,3,FALSE)' },
      'F4': { value: 'Salary:' }, 'G4': { value: '=VLOOKUP(G1,A2:D5,4,FALSE)' },
      'F6': { value: '>>> FALSE = exact match (unsorted table)' },
      'F7': { value: '>>> Change G1 to look up other employees!' },
    },
  },
  {
    name: '3.2.4b VLOOKUP (Approx Match)',
    description: 'Grade classification with sorted table',
    category: '3.2.4 Lookup',
    data: {
      'A1': { value: '--- GRADE TABLE (SORTED) ---' },
      'A2': { value: 'Min Score' }, 'B2': { value: 'Grade' },
      'A3': { value: '0' }, 'B3': { value: 'F' },
      'A4': { value: '50' }, 'B4': { value: 'D' },
      'A5': { value: '60' }, 'B5': { value: 'C' },
      'A6': { value: '70' }, 'B6': { value: 'B' },
      'A7': { value: '80' }, 'B7': { value: 'A' },
      'D1': { value: 'Student' }, 'E1': { value: 'Score' }, 'F1': { value: 'Grade' },
      'D2': { value: 'Alice' }, 'E2': { value: '75' }, 'F2': { value: '=VLOOKUP(E2,$A$3:$B$7,2,TRUE)' },
      'D3': { value: 'Bob' }, 'E3': { value: '55' }, 'F3': { value: '=VLOOKUP(E3,$A$3:$B$7,2,TRUE)' },
      'D4': { value: 'Charlie' }, 'E4': { value: '92' }, 'F4': { value: '=VLOOKUP(E4,$A$3:$B$7,2,TRUE)' },
      'D6': { value: '>>> TRUE = approximate match (SORTED table required)' },
    },
  },
  {
    name: '3.2.4c HLOOKUP Practice',
    description: 'Horizontal lookup from tables',
    category: '3.2.4 Lookup',
    data: {
      'A1': { value: '--- QUARTERLY SALES ---' },
      'A2': { value: 'Quarter' }, 'B2': { value: 'Q1' }, 'C2': { value: 'Q2' }, 'D2': { value: 'Q3' }, 'E2': { value: 'Q4' },
      'A3': { value: 'Sales' }, 'B3': { value: '10000' }, 'C3': { value: '12000' }, 'D3': { value: '15000' }, 'E3': { value: '18000' },
      'A4': { value: 'Expenses' }, 'B4': { value: '8000' }, 'C4': { value: '9000' }, 'D4': { value: '11000' }, 'E4': { value: '13000' },
      'A6': { value: 'Lookup Quarter:' }, 'B6': { value: 'Q3' },
      'A7': { value: 'Sales:' }, 'B7': { value: '=HLOOKUP(B6,B2:E4,2,FALSE)' },
      'A8': { value: 'Expenses:' }, 'B8': { value: '=HLOOKUP(B6,B2:E4,3,FALSE)' },
      'A10': { value: '>>> HLOOKUP looks across rows (horizontal)' },
      'A11': { value: '>>> Change B6 to see different quarters!' },
    },
  },
  {
    name: '3.2.4d INDEX-MATCH',
    description: 'Flexible lookup with INDEX & MATCH',
    category: '3.2.4 Lookup',
    data: {
      'A1': { value: 'Name' }, 'B1': { value: 'Product' }, 'C1': { value: 'Sales' },
      'A2': { value: 'Alice' }, 'B2': { value: 'Laptop' }, 'C2': { value: '1200' },
      'A3': { value: 'Bob' }, 'B3': { value: 'Phone' }, 'C3': { value: '800' },
      'A4': { value: 'Charlie' }, 'B4': { value: 'Tablet' }, 'C4': { value: '500' },
      'E1': { value: 'Find Sales for:' }, 'F1': { value: 'Bob' },
      'E2': { value: 'MATCH position:' }, 'F2': { value: '=MATCH(F1,A2:A4,0)' },
      'E3': { value: 'INDEX result:' }, 'F3': { value: '=INDEX(C2:C4,MATCH(F1,A2:A4,0))' },
      'E5': { value: '>>> INDEX(range, row) returns value at position' },
      'E6': { value: '>>> MATCH(value, range, 0) finds position' },
      'E7': { value: '>>> Combined: More flexible than VLOOKUP!' },
    },
  },
  // =============================================
  // 3.2.5 DATE FUNCTIONS
  // =============================================
  {
    name: '3.2.5 Date Functions',
    description: 'TODAY, NOW, DAYS between dates',
    category: '3.2.5 Date',
    data: {
      'A1': { value: '--- DATE FUNCTIONS ---' },
      'A3': { value: 'Function' }, 'B3': { value: 'Formula' }, 'C3': { value: 'Result' },
      'A4': { value: 'Today' }, 'B4': { value: 'TODAY()' }, 'C4': { value: '=TODAY()' },
      'A5': { value: 'Now (date+time)' }, 'B5': { value: 'NOW()' }, 'C5': { value: '=NOW()' },
      'A7': { value: '--- DAYS BETWEEN DATES ---' },
      'A8': { value: 'Start Date:' }, 'B8': { value: '2024-01-15' },
      'A9': { value: 'End Date:' }, 'B9': { value: '2024-03-20' },
      'A10': { value: 'Days Between:' }, 'B10': { value: '=DAYS(B9,B8)' },
      'A12': { value: '>>> DAYS(end_date, start_date) calculates difference' },
    },
  },
  // =============================================
  // EXTRA: Data Types
  // =============================================
  {
    name: 'Data Types Overview',
    description: 'Numbers, Text, Dates, Boolean, Formulas',
    category: 'Reference',
    data: {
      'A1': { value: '--- DATA TYPES IN SPREADSHEETS ---' },
      'A3': { value: 'Type' }, 'B3': { value: 'Example' }, 'C3': { value: 'Notes' },
      'A4': { value: 'Number' }, 'B4': { value: '42.5' }, 'C4': { value: 'Used in calculations' },
      'A5': { value: 'Text' }, 'B5': { value: 'Hello World' }, 'C5': { value: 'Also called String' },
      'A6': { value: 'Date' }, 'B6': { value: '=TODAY()' }, 'C6': { value: 'Stored as numbers internally' },
      'A7': { value: 'Boolean' }, 'B7': { value: 'TRUE' }, 'C7': { value: 'TRUE or FALSE' },
      'A8': { value: 'Formula' }, 'B8': { value: '=2+2' }, 'C8': { value: 'Starts with =' },
      'A10': { value: 'Percentage' }, 'B10': { value: '=50%' }, 'C10': { value: '50% = 0.5' },
    },
  },
];

// ============================================
// MAIN PAGE COMPONENT
// ============================================
export default function SpreadsheetPage() {
  const [data, setData] = useState<SheetData>({});
  const [selection, setSelection] = useState<Selection | null>(null);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  
  // Drag states
  const [isDragging, setIsDragging] = useState(false);
  const [isFillDragging, setIsFillDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ row: number; col: number } | null>(null);
  const [fillPreview, setFillPreview] = useState<Selection | null>(null);
  
  // Goal Seek state
  const [showGoalSeek, setShowGoalSeek] = useState(false);
  const [goalSeek, setGoalSeek] = useState<GoalSeekState>({
    targetCell: '',
    targetValue: '',
    changingCell: '',
    isRunning: false,
  });
  
  // Conditional Formatting state
  const [showCondFormat, setShowCondFormat] = useState(false);
  const [condFormatRules, setCondFormatRules] = useState<ConditionalFormatRule[]>([]);
  const [editingRule, setEditingRule] = useState<ConditionalFormatRule | null>(null);
  
  const gridRef = useRef<HTMLDivElement>(null);

  // Goal Seek Algorithm
  const runGoalSeek = useCallback(() => {
    const { targetCell, targetValue, changingCell } = goalSeek;
    if (!targetCell || !targetValue || !changingCell) {
      toast.error('Please fill in all Goal Seek fields');
      return;
    }

    const targetParsed = parseCellRef(targetCell.toUpperCase());
    const changingParsed = parseCellRef(changingCell.toUpperCase());
    
    if (!targetParsed || !changingParsed) {
      toast.error('Invalid cell reference');
      return;
    }

    const targetCellId = getCellId(targetParsed[0], targetParsed[1]);
    const changingCellId = getCellId(changingParsed[0], changingParsed[1]);
    const targetNum = parseFloat(targetValue);

    if (isNaN(targetNum)) {
      toast.error('Target value must be a number');
      return;
    }

    setGoalSeek(prev => ({ ...prev, isRunning: true }));

    // Binary search / Newton-Raphson approximation
    let low = -1000000;
    let high = 1000000;
    let mid = 0;
    let iterations = 0;
    const maxIterations = 100;
    const tolerance = 0.00001;

    const evaluateWithValue = (val: number): number => {
      const testData = { ...data, [changingCellId]: { value: String(val) } };
      const result = evaluateFormula(testData[targetCellId]?.value || '', testData);
      return parseFloat(result) || 0;
    };

    // Initial guess
    mid = 0;
    let result = evaluateWithValue(mid);

    while (iterations < maxIterations) {
      if (Math.abs(result - targetNum) < tolerance) break;

      // Try to find direction
      const resultHigh = evaluateWithValue(high);
      const resultLow = evaluateWithValue(low);

      if ((resultLow <= targetNum && targetNum <= resultHigh) || 
          (resultHigh <= targetNum && targetNum <= resultLow)) {
        mid = (low + high) / 2;
        result = evaluateWithValue(mid);

        if (result < targetNum) {
          if (resultHigh > resultLow) low = mid;
          else high = mid;
        } else {
          if (resultHigh > resultLow) high = mid;
          else low = mid;
        }
      } else {
        // Expand search range
        low *= 2;
        high *= 2;
      }

      iterations++;
    }

    // Apply result
    const finalValue = Math.round(mid * 100000) / 100000;
    setData(prev => ({ ...prev, [changingCellId]: { value: String(finalValue) } }));
    setGoalSeek(prev => ({ ...prev, result: finalValue, isRunning: false }));
    toast.success(`Goal Seek found: ${changingCell} = ${finalValue}`);
  }, [goalSeek, data]);

  // Conditional Formatting - Check if a cell matches a rule
  const getCellConditionalFormat = useCallback((cellId: string, cellValue: string): ConditionalFormatRule['format'] | null => {
    for (const rule of condFormatRules) {
      // Check if cell is in rule range
      const rangeMatch = rule.range.toUpperCase().match(/^([A-Z]+\d+):([A-Z]+\d+)$/);
      if (!rangeMatch) continue;

      const start = parseCellRef(rangeMatch[1]);
      const end = parseCellRef(rangeMatch[2]);
      if (!start || !end) continue;

      const cellMatch = cellId.match(/^([A-Z]+)(\d+)$/);
      if (!cellMatch) continue;
      const cellCol = cellMatch[1].charCodeAt(0) - 65;
      const cellRow = parseInt(cellMatch[2]) - 1;

      const minRow = Math.min(start[0], end[0]);
      const maxRow = Math.max(start[0], end[0]);
      const minCol = Math.min(start[1], end[1]);
      const maxCol = Math.max(start[1], end[1]);

      if (cellRow < minRow || cellRow > maxRow || cellCol < minCol || cellCol > maxCol) continue;

      // Check condition
      const numValue = parseFloat(cellValue);
      const value1Num = parseFloat(rule.value1);
      const value2Num = parseFloat(rule.value2 || '0');

      let matches = false;
      switch (rule.conditionType) {
        case 'greaterThan':
          matches = !isNaN(numValue) && numValue > value1Num;
          break;
        case 'lessThan':
          matches = !isNaN(numValue) && numValue < value1Num;
          break;
        case 'equalTo':
          matches = cellValue === rule.value1 || (!isNaN(numValue) && numValue === value1Num);
          break;
        case 'notEqualTo':
          matches = cellValue !== rule.value1 && (isNaN(numValue) || numValue !== value1Num);
          break;
        case 'between':
          matches = !isNaN(numValue) && numValue >= Math.min(value1Num, value2Num) && numValue <= Math.max(value1Num, value2Num);
          break;
        case 'notBetween':
          matches = !isNaN(numValue) && (numValue < Math.min(value1Num, value2Num) || numValue > Math.max(value1Num, value2Num));
          break;
        case 'containsText':
          matches = cellValue.toLowerCase().includes(rule.value1.toLowerCase());
          break;
        case 'notContainsText':
          matches = !cellValue.toLowerCase().includes(rule.value1.toLowerCase());
          break;
        case 'aboveAverage': {
          const rangeVals = getRangeNumericValues(rule.range.toUpperCase(), data, new Set());
          const avg = rangeVals.reduce((a, b) => a + b, 0) / rangeVals.length;
          matches = !isNaN(numValue) && numValue > avg;
          break;
        }
        case 'belowAverage': {
          const rangeVals = getRangeNumericValues(rule.range.toUpperCase(), data, new Set());
          const avg = rangeVals.reduce((a, b) => a + b, 0) / rangeVals.length;
          matches = !isNaN(numValue) && numValue < avg;
          break;
        }
      }

      if (matches) return rule.format;
    }
    return null;
  }, [condFormatRules, data]);

  // Add a conditional format rule
  const addCondFormatRule = useCallback((rule: Omit<ConditionalFormatRule, 'id'>) => {
    const newRule: ConditionalFormatRule = {
      ...rule,
      id: Date.now().toString(),
    };
    setCondFormatRules(prev => [...prev, newRule]);
    toast.success('Conditional format rule added');
  }, []);

  // Remove a conditional format rule
  const removeCondFormatRule = useCallback((id: string) => {
    setCondFormatRules(prev => prev.filter(r => r.id !== id));
    toast.success('Rule removed');
  }, []);

  const displayValues = useMemo(() => {
    const result: Record<string, string> = {};
    Object.keys(data).forEach((id) => {
      const val = data[id]?.value || '';
      result[id] = val.startsWith('=') ? evaluateFormula(val, data) : val;
    });
    return result;
  }, [data]);

  // Get normalized selection bounds
  const getSelectionBounds = useCallback((sel: Selection) => {
    return {
      minRow: Math.min(sel.startRow, sel.endRow),
      maxRow: Math.max(sel.startRow, sel.endRow),
      minCol: Math.min(sel.startCol, sel.endCol),
      maxCol: Math.max(sel.startCol, sel.endCol),
    };
  }, []);

  // Check if cell is in selection
  const isCellInSelection = useCallback((row: number, col: number, sel: Selection | null) => {
    if (!sel) return false;
    const bounds = getSelectionBounds(sel);
    return row >= bounds.minRow && row <= bounds.maxRow && col >= bounds.minCol && col <= bounds.maxCol;
  }, [getSelectionBounds]);

  // Handle mouse down on cell
  const handleCellMouseDown = useCallback((row: number, col: number, e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    
    if (editingCell) {
      setEditingCell(null);
    }
    
    setIsDragging(true);
    setDragStart({ row, col });
    setSelection({ startRow: row, startCol: col, endRow: row, endCol: col });
  }, [editingCell]);

  // Handle mouse enter on cell during drag
  const handleCellMouseEnter = useCallback((row: number, col: number) => {
    if (isDragging && dragStart) {
      setSelection({
        startRow: dragStart.row,
        startCol: dragStart.col,
        endRow: row,
        endCol: col,
      });
    }
    if (isFillDragging && selection) {
      const bounds = getSelectionBounds(selection);
      // Determine fill direction based on position relative to selection
      if (row > bounds.maxRow) {
        setFillPreview({ startRow: bounds.maxRow + 1, startCol: bounds.minCol, endRow: row, endCol: bounds.maxCol });
      } else if (row < bounds.minRow) {
        setFillPreview({ startRow: row, startCol: bounds.minCol, endRow: bounds.minRow - 1, endCol: bounds.maxCol });
      } else if (col > bounds.maxCol) {
        setFillPreview({ startRow: bounds.minRow, startCol: bounds.maxCol + 1, endRow: bounds.maxRow, endCol: col });
      } else if (col < bounds.minCol) {
        setFillPreview({ startRow: bounds.minRow, startCol: col, endRow: bounds.maxRow, endCol: bounds.minCol - 1 });
      }
    }
  }, [isDragging, isFillDragging, dragStart, selection, getSelectionBounds]);

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    if (isFillDragging && fillPreview && selection) {
      // Perform fill operation
      const sourceBounds = getSelectionBounds(selection);
      const fillBounds = getSelectionBounds(fillPreview);
      
      setData(prev => {
        const newData = { ...prev };
        
        // Determine if filling vertically or horizontally
        const fillingDown = fillBounds.minRow > sourceBounds.maxRow;
        const fillingUp = fillBounds.maxRow < sourceBounds.minRow;
        const fillingRight = fillBounds.minCol > sourceBounds.maxCol;
        const fillingLeft = fillBounds.maxCol < sourceBounds.minCol;
        
        if (fillingDown || fillingUp) {
          // Vertical fill
          for (let col = sourceBounds.minCol; col <= sourceBounds.maxCol; col++) {
            const sourceCol = col;
            let sourceRowIdx = 0;
            const sourceRows = sourceBounds.maxRow - sourceBounds.minRow + 1;
            
            for (let row = fillBounds.minRow; row <= fillBounds.maxRow; row++) {
              const sourceRow = sourceBounds.minRow + (sourceRowIdx % sourceRows);
              const sourceId = getCellId(sourceRow, sourceCol);
              const targetId = getCellId(row, col);
              const sourceValue = prev[sourceId]?.value || '';
              
              if (sourceValue) {
                const rowDelta = row - sourceRow;
                const adjustedValue = adjustFormula(sourceValue, rowDelta, 0);
                newData[targetId] = { value: adjustedValue };
              }
              sourceRowIdx++;
            }
          }
        } else if (fillingRight || fillingLeft) {
          // Horizontal fill
          for (let row = sourceBounds.minRow; row <= sourceBounds.maxRow; row++) {
            const sourceRow = row;
            let sourceColIdx = 0;
            const sourceCols = sourceBounds.maxCol - sourceBounds.minCol + 1;
            
            for (let col = fillBounds.minCol; col <= fillBounds.maxCol; col++) {
              const sourceCol = sourceBounds.minCol + (sourceColIdx % sourceCols);
              const sourceId = getCellId(sourceRow, sourceCol);
              const targetId = getCellId(row, col);
              const sourceValue = prev[sourceId]?.value || '';
              
              if (sourceValue) {
                const colDelta = col - sourceCol;
                const adjustedValue = adjustFormula(sourceValue, 0, colDelta);
                newData[targetId] = { value: adjustedValue };
              }
              sourceColIdx++;
            }
          }
        }
        
        return newData;
      });
      
      // Expand selection to include filled cells
      setSelection({
        startRow: Math.min(sourceBounds.minRow, fillBounds.minRow),
        startCol: Math.min(sourceBounds.minCol, fillBounds.minCol),
        endRow: Math.max(sourceBounds.maxRow, fillBounds.maxRow),
        endCol: Math.max(sourceBounds.maxCol, fillBounds.maxCol),
      });
    }
    
    setIsDragging(false);
    setIsFillDragging(false);
    setDragStart(null);
    setFillPreview(null);
  }, [isFillDragging, fillPreview, selection, getSelectionBounds]);

  // Handle fill handle mouse down
  const handleFillHandleMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsFillDragging(true);
  }, []);

  // Global mouse up listener
  useEffect(() => {
    const handleGlobalMouseUp = () => handleMouseUp();
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [handleMouseUp]);

  const handleCellDoubleClick = useCallback((cellId: string) => {
    setEditingCell(cellId);
  }, []);

  const handleCellChange = useCallback((cellId: string, value: string) => {
    setData(prev => ({ ...prev, [cellId]: { value } }));
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, row: number, col: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setEditingCell(null);
      if (row < ROWS - 1) {
        setSelection({ startRow: row + 1, startCol: col, endRow: row + 1, endCol: col });
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      setEditingCell(null);
      if (col < COLS - 1) {
        setSelection({ startRow: row, startCol: col + 1, endRow: row, endCol: col + 1 });
      }
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  }, []);

  const handleGridKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!selection || editingCell) return;
    const bounds = getSelectionBounds(selection);
    const row = bounds.minRow;
    const col = bounds.minCol;
    const cellId = getCellId(row, col);

    if (e.key === 'ArrowUp' && row > 0) {
      setSelection({ startRow: row - 1, startCol: col, endRow: row - 1, endCol: col });
    } else if (e.key === 'ArrowDown' && row < ROWS - 1) {
      setSelection({ startRow: row + 1, startCol: col, endRow: row + 1, endCol: col });
    } else if (e.key === 'ArrowLeft' && col > 0) {
      setSelection({ startRow: row, startCol: col - 1, endRow: row, endCol: col - 1 });
    } else if (e.key === 'ArrowRight' && col < COLS - 1) {
      setSelection({ startRow: row, startCol: col + 1, endRow: row, endCol: col + 1 });
    } else if (e.key === 'Enter' || e.key === 'F2') {
      setEditingCell(cellId);
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      // Delete all selected cells
      setData(prev => {
        const newData = { ...prev };
        for (let r = bounds.minRow; r <= bounds.maxRow; r++) {
          for (let c = bounds.minCol; c <= bounds.maxCol; c++) {
            delete newData[getCellId(r, c)];
          }
        }
        return newData;
      });
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      setEditingCell(cellId);
      setData(prev => ({ ...prev, [cellId]: { value: e.key } }));
    }
  }, [selection, editingCell, getSelectionBounds]);

  // Copy/Paste support
  useEffect(() => {
    const handleCopy = (e: ClipboardEvent) => {
      if (!selection || editingCell) return;
      const bounds = getSelectionBounds(selection);
      
      let text = '';
      for (let r = bounds.minRow; r <= bounds.maxRow; r++) {
        const rowData: string[] = [];
        for (let c = bounds.minCol; c <= bounds.maxCol; c++) {
          rowData.push(displayValues[getCellId(r, c)] || '');
        }
        text += rowData.join('\t') + '\n';
      }
      
      e.clipboardData?.setData('text/plain', text.trim());
      e.preventDefault();
    };
    
    const handlePaste = (e: ClipboardEvent) => {
      if (!selection || editingCell) return;
      const bounds = getSelectionBounds(selection);
      const text = e.clipboardData?.getData('text/plain') || '';
      const rows = text.split('\n').map(r => r.split('\t'));
      
      setData(prev => {
        const newData = { ...prev };
        rows.forEach((row, rIdx) => {
          row.forEach((cell, cIdx) => {
            const targetRow = bounds.minRow + rIdx;
            const targetCol = bounds.minCol + cIdx;
            if (targetRow < ROWS && targetCol < COLS) {
              newData[getCellId(targetRow, targetCol)] = { value: cell };
            }
          });
        });
        return newData;
      });
      
      e.preventDefault();
    };
    
    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
    };
  }, [selection, editingCell, displayValues, getSelectionBounds]);

  const loadTemplate = useCallback((template: typeof spreadsheetTemplates[0]) => {
    setData({ ...template.data });
    setSelection(null);
    setEditingCell(null);
    setShowTemplates(false);
    toast.success(`Loaded: ${template.name}`);
  }, []);

  const clearSheet = useCallback(() => {
    setData({});
    setSelection(null);
    setEditingCell(null);
    toast.success('Sheet cleared');
  }, []);

  const handleSave = async () => {
    try {
      await fetch('/api/spreadsheets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: 'My Spreadsheet', data }) });
      toast.success('Spreadsheet saved!');
    } catch { toast.error('Failed to save'); }
  };

  const selectedCellId = selection ? getCellId(Math.min(selection.startRow, selection.endRow), Math.min(selection.startCol, selection.endCol)) : null;
  const selectedValue = selectedCellId ? data[selectedCellId]?.value || '' : '';
  const selectionBounds = selection ? getSelectionBounds(selection) : null;

  return (
    <>
      <Head><title>Spreadsheet | Computing 7155 Portal</title></Head>
      <div className="h-[calc(100vh-100px)] select-none">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3">
          <div>
            <h1 className="text-2xl font-bold text-white">📊 Spreadsheet</h1>
            <p className="text-slate-400 text-sm">Module 3 - Drag cells to fill, click+drag to select</p>
          </div>
          <div className="flex items-center space-x-2 mt-3 sm:mt-0 flex-wrap gap-y-2">
            <div className="relative">
              <button onClick={() => setShowTemplates(!showTemplates)} className="flex items-center px-3 py-2 bg-slate-700 text-slate-200 rounded-lg hover:bg-slate-600 text-sm">
                Templates <FiChevronDown className="ml-1" />
              </button>
              {showTemplates && (
                <div className="absolute right-0 mt-2 w-72 bg-slate-800 rounded-lg shadow-xl border border-slate-700 z-50 max-h-80 overflow-y-auto">
                  {spreadsheetTemplates.map((t, i) => (
                    <button key={i} onClick={() => loadTemplate(t)} className="w-full text-left px-4 py-2 hover:bg-slate-700 first:rounded-t-lg last:rounded-b-lg border-b border-slate-700/50 last:border-0">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-white text-sm">{t.name}</span>
                        <span className="text-xs text-slate-500">{t.category}</span>
                      </div>
                      <div className="text-xs text-slate-400">{t.description}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => setShowGoalSeek(true)} className="flex items-center px-3 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-500 text-sm" title="Goal Seek - What-If Analysis">
              <FiTarget className="mr-1" /> Goal Seek
            </button>
            <button onClick={() => setShowCondFormat(true)} className="flex items-center px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 text-sm" title="Conditional Formatting">
              <FiDroplet className="mr-1" /> Cond. Format
            </button>
            <button onClick={clearSheet} className="flex items-center px-3 py-2 bg-slate-700 text-slate-200 rounded-lg hover:bg-slate-600 text-sm">
              <FiRefreshCw className="mr-1" /> Clear
            </button>
            <button onClick={() => setShowHelp(!showHelp)} className="flex items-center px-3 py-2 bg-slate-700 text-slate-200 rounded-lg hover:bg-slate-600 text-sm">
              <FiHelpCircle className="mr-1" /> Help
            </button>
            <button onClick={handleSave} className="flex items-center px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 text-sm">
              <FiSave className="mr-1" /> Save
            </button>
          </div>
        </div>

        {/* Formula Bar */}
        <div className="mb-2 flex items-center bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
          <div className="px-3 py-2 bg-slate-700 text-slate-300 font-mono text-sm min-w-[60px] text-center border-r border-slate-600">
            {selectionBounds ? `${getCellId(selectionBounds.minRow, selectionBounds.minCol)}${selectionBounds.minRow !== selectionBounds.maxRow || selectionBounds.minCol !== selectionBounds.maxCol ? ':' + getCellId(selectionBounds.maxRow, selectionBounds.maxCol) : ''}` : '—'}
          </div>
          <div className="px-2 py-2 text-slate-500 text-sm border-r border-slate-600">fx</div>
          <input 
            type="text" 
            value={selectedValue} 
            onChange={(e) => {
              if (selectedCellId) {
                handleCellChange(selectedCellId, e.target.value);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && selectedCellId && selectionBounds) {
                e.preventDefault();
                setEditingCell(null);
                // Move to next row
                if (selectionBounds.minRow < ROWS - 1) {
                  setSelection({ 
                    startRow: selectionBounds.minRow + 1, 
                    startCol: selectionBounds.minCol, 
                    endRow: selectionBounds.minRow + 1, 
                    endCol: selectionBounds.minCol 
                  });
                }
                gridRef.current?.focus();
              } else if (e.key === 'Escape') {
                setEditingCell(null);
                gridRef.current?.focus();
              }
            }}
            disabled={!selectedCellId}
            className="flex-1 px-3 py-2 bg-slate-800 text-white font-mono text-sm outline-none focus:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed" 
            placeholder={selectedCellId ? "Enter value or formula (start with =)" : "Select a cell first..."} 
          />
        </div>

        {/* Help Panel */}
        {showHelp && (
          <div className="mb-3 bg-slate-800/80 backdrop-blur rounded-xl border border-slate-700/50 p-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
              <div className="bg-slate-700/50 rounded-lg p-2">
                <div className="text-emerald-400 font-semibold mb-1">🖱️ Selection & Navigation</div>
                <div className="text-slate-400">Click+Drag: Select range</div>
                <div className="text-slate-400">Arrow keys: Navigate</div>
                <div className="text-slate-400">Ctrl+C/V: Copy/Paste</div>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-2">
                <div className="text-blue-400 font-semibold mb-1">📋 Cell References</div>
                <div className="text-slate-400">A1 - Relative (adjusts)</div>
                <div className="text-slate-400">$A$1 - Absolute (fixed)</div>
                <div className="text-slate-400">$A1, A$1 - Mixed</div>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-2">
                <div className="text-purple-400 font-semibold mb-1">🔧 Special Features</div>
                <div className="text-slate-400">Blue Handle: Drag to fill</div>
                <div className="text-slate-400">Goal Seek: What-if analysis</div>
                <div className="text-slate-400">Cond. Format: Color rules</div>
              </div>
            </div>
            <div className="border-t border-slate-700 pt-2">
              <div className="text-slate-300 font-semibold mb-1">📊 Supported Functions (7155 Syllabus)</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-slate-400">
                <div><span className="text-yellow-400">Math:</span> SUM, ROUND, SQRT, POWER, MOD</div>
                <div><span className="text-green-400">Stats:</span> AVERAGE, COUNT, MIN, MAX, MEDIAN</div>
                <div><span className="text-blue-400">Logic:</span> IF, AND, OR, NOT</div>
                <div><span className="text-pink-400">Text:</span> LEFT, RIGHT, MID, LEN, CONCAT</div>
                <div><span className="text-orange-400">Lookup:</span> VLOOKUP, HLOOKUP, INDEX, MATCH</div>
                <div><span className="text-cyan-400">Date:</span> TODAY, NOW, DAYS</div>
                <div><span className="text-purple-400">Count:</span> COUNTA, COUNTBLANK, COUNTIF</div>
                <div><span className="text-red-400">Cond:</span> SUMIF, AVERAGEIF, RANK.EQ</div>
              </div>
            </div>
          </div>
        )}

        {/* Spreadsheet Grid */}
        <div 
          ref={gridRef}
          className="bg-white rounded-xl overflow-auto shadow-lg relative" 
          style={{ height: showHelp ? 'calc(100% - 170px)' : 'calc(100% - 110px)' }} 
          tabIndex={0} 
          onKeyDown={handleGridKeyDown}
        >
          <table className="border-collapse w-full">
            <thead className="sticky top-0 z-20">
              <tr>
                <th className="bg-slate-100 border border-slate-200 w-[40px] h-[28px] text-xs font-semibold text-slate-500"></th>
                {COL_LABELS.map((l) => (
                  <th key={l} className="bg-slate-100 border border-slate-200 min-w-[80px] h-[28px] text-xs font-semibold text-slate-600">{l}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: ROWS }, (_, row) => (
                <tr key={row}>
                  <td className="bg-slate-100 border border-slate-200 text-center text-xs font-semibold text-slate-500 sticky left-0 z-10">{row + 1}</td>
                  {Array.from({ length: COLS }, (_, col) => {
                    const cellId = getCellId(row, col);
                    const isInSelection = isCellInSelection(row, col, selection);
                    const isInFillPreview = isCellInSelection(row, col, fillPreview);
                    const isActiveCell = selection && row === Math.min(selection.startRow, selection.endRow) && col === Math.min(selection.startCol, selection.endCol);
                    const isEditing = editingCell === cellId;
                    const cellValue = data[cellId]?.value || '';
                    const displayValue = displayValues[cellId] || '';
                    const isError = displayValue.startsWith('#');
                    
                    // Get conditional formatting for this cell
                    const condFormat = getCellConditionalFormat(cellId, displayValue);
                    
                    // Check if this is the bottom-right cell of selection (for fill handle)
                    const showFillHandle = selectionBounds && 
                      row === selectionBounds.maxRow && 
                      col === selectionBounds.maxCol && 
                      !isEditing;

                    return (
                      <td
                        key={cellId}
                        className={`border border-slate-200 min-w-[80px] h-[32px] p-0 relative
                          ${isInFillPreview ? 'bg-blue-100 border-blue-300' : ''}
                          ${isInSelection && !isInFillPreview && !condFormat ? 'bg-blue-50' : ''}
                          ${!isInSelection && !isInFillPreview && !condFormat ? 'bg-white' : ''}
                          ${isActiveCell ? 'outline outline-2 outline-blue-500 outline-offset-[-1px]' : ''}
                        `}
                        style={condFormat && !isInFillPreview ? { backgroundColor: condFormat.backgroundColor } : undefined}
                        onMouseDown={(e) => handleCellMouseDown(row, col, e)}
                        onMouseEnter={() => handleCellMouseEnter(row, col)}
                        onDoubleClick={() => handleCellDoubleClick(cellId)}
                      >
                        {isEditing ? (
                          <input
                            type="text"
                            value={cellValue}
                            onChange={(e) => handleCellChange(cellId, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, row, col)}
                            onBlur={() => setEditingCell(null)}
                            autoFocus
                            className="w-full h-full px-2 text-sm border-none outline-none bg-white"
                          />
                        ) : (
                          <div 
                            className={`w-full h-full px-2 text-sm flex items-center truncate ${isError ? 'text-red-500 font-medium' : ''} ${condFormat?.bold ? 'font-bold' : ''} ${condFormat?.italic ? 'italic' : ''}`}
                            style={condFormat ? { color: condFormat.textColor } : undefined}
                          >
                            {displayValue}
                          </div>
                        )}
                        {showFillHandle && (
                          <div
                            className="absolute w-3 h-3 bg-blue-500 border border-white cursor-crosshair z-30"
                            style={{ bottom: -2, right: -2 }}
                            onMouseDown={handleFillHandleMouseDown}
                          />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Goal Seek Modal */}
        {showGoalSeek && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md border border-slate-700 shadow-2xl">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white flex items-center">
                  <FiTarget className="mr-2 text-amber-400" /> Goal Seek
                </h2>
                <button onClick={() => setShowGoalSeek(false)} className="text-slate-400 hover:text-white">
                  <FiX size={24} />
                </button>
              </div>
              <p className="text-slate-400 text-sm mb-4">
                Find the input value needed to achieve a specific result in a formula cell.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Set cell (formula cell)</label>
                  <input
                    type="text"
                    value={goalSeek.targetCell}
                    onChange={(e) => setGoalSeek(prev => ({ ...prev, targetCell: e.target.value.toUpperCase() }))}
                    placeholder="e.g., B5"
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1">To value</label>
                  <input
                    type="text"
                    value={goalSeek.targetValue}
                    onChange={(e) => setGoalSeek(prev => ({ ...prev, targetValue: e.target.value }))}
                    placeholder="e.g., 100"
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1">By changing cell</label>
                  <input
                    type="text"
                    value={goalSeek.changingCell}
                    onChange={(e) => setGoalSeek(prev => ({ ...prev, changingCell: e.target.value.toUpperCase() }))}
                    placeholder="e.g., A2"
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
                  />
                </div>
                {goalSeek.result !== undefined && (
                  <div className="bg-emerald-900/30 border border-emerald-700 rounded-lg p-3">
                    <p className="text-emerald-400 text-sm">
                      ✓ Result: {goalSeek.changingCell} = <strong>{goalSeek.result}</strong>
                    </p>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => setShowGoalSeek(false)}
                  className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600"
                >
                  Close
                </button>
                <button
                  onClick={runGoalSeek}
                  disabled={goalSeek.isRunning}
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-500 disabled:opacity-50 flex items-center"
                >
                  {goalSeek.isRunning ? 'Searching...' : 'Find Solution'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Conditional Formatting Modal */}
        {showCondFormat && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-xl p-6 w-full max-w-lg border border-slate-700 shadow-2xl max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white flex items-center">
                  <FiDroplet className="mr-2 text-purple-400" /> Conditional Formatting
                </h2>
                <button onClick={() => { setShowCondFormat(false); setEditingRule(null); }} className="text-slate-400 hover:text-white">
                  <FiX size={24} />
                </button>
              </div>
              
              {/* Existing Rules */}
              {condFormatRules.length > 0 && !editingRule && (
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-slate-300 mb-2">Active Rules</h3>
                  <div className="space-y-2">
                    {condFormatRules.map(rule => (
                      <div key={rule.id} className="flex items-center justify-between bg-slate-700/50 rounded-lg p-3">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-6 h-6 rounded border border-slate-500"
                            style={{ backgroundColor: rule.format.backgroundColor || 'transparent' }}
                          />
                          <div>
                            <span className="text-white text-sm">{rule.range}</span>
                            <span className="text-slate-400 text-xs ml-2">
                              {rule.conditionType.replace(/([A-Z])/g, ' $1').toLowerCase()}
                              {rule.value1 && ` ${rule.value1}`}
                              {rule.value2 && ` - ${rule.value2}`}
                            </span>
                          </div>
                        </div>
                        <button 
                          onClick={() => removeCondFormatRule(rule.id)}
                          className="text-red-400 hover:text-red-300 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add New Rule Form */}
              <div className="border-t border-slate-700 pt-4">
                <h3 className="text-sm font-semibold text-slate-300 mb-3">Add New Rule</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Apply to range</label>
                    <input
                      type="text"
                      placeholder="e.g., A1:B10"
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
                      id="condFormat-range"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Condition</label>
                    <select
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                      id="condFormat-condition"
                    >
                      <option value="greaterThan">Greater than</option>
                      <option value="lessThan">Less than</option>
                      <option value="equalTo">Equal to</option>
                      <option value="notEqualTo">Not equal to</option>
                      <option value="between">Between</option>
                      <option value="notBetween">Not between</option>
                      <option value="containsText">Contains text</option>
                      <option value="notContainsText">Does not contain text</option>
                      <option value="aboveAverage">Above average</option>
                      <option value="belowAverage">Below average</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">Value 1</label>
                      <input
                        type="text"
                        placeholder="e.g., 50"
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
                        id="condFormat-value1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">Value 2 (for between)</label>
                      <input
                        type="text"
                        placeholder="e.g., 100"
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
                        id="condFormat-value2"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">Background Color</label>
                      <div className="flex gap-2">
                        {['#22c55e', '#ef4444', '#f59e0b', '#3b82f6', '#a855f7', '#ec4899'].map(color => (
                          <button
                            key={color}
                            className="w-8 h-8 rounded border-2 border-slate-500 hover:border-white transition-colors"
                            style={{ backgroundColor: color }}
                            onClick={() => {
                              const input = document.getElementById('condFormat-bgColor') as HTMLInputElement;
                              if (input) input.value = color;
                            }}
                          />
                        ))}
                        <input
                          type="color"
                          id="condFormat-bgColor"
                          defaultValue="#22c55e"
                          className="w-8 h-8 rounded cursor-pointer bg-transparent"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">Text Color</label>
                      <div className="flex gap-2">
                        {['#ffffff', '#000000', '#22c55e', '#ef4444'].map(color => (
                          <button
                            key={color}
                            className="w-8 h-8 rounded border-2 border-slate-500 hover:border-white transition-colors"
                            style={{ backgroundColor: color }}
                            onClick={() => {
                              const input = document.getElementById('condFormat-textColor') as HTMLInputElement;
                              if (input) input.value = color;
                            }}
                          />
                        ))}
                        <input
                          type="color"
                          id="condFormat-textColor"
                          defaultValue="#ffffff"
                          className="w-8 h-8 rounded cursor-pointer bg-transparent"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    const range = (document.getElementById('condFormat-range') as HTMLInputElement)?.value;
                    const condition = (document.getElementById('condFormat-condition') as HTMLSelectElement)?.value as ConditionType;
                    const value1 = (document.getElementById('condFormat-value1') as HTMLInputElement)?.value;
                    const value2 = (document.getElementById('condFormat-value2') as HTMLInputElement)?.value;
                    const bgColor = (document.getElementById('condFormat-bgColor') as HTMLInputElement)?.value;
                    const textColor = (document.getElementById('condFormat-textColor') as HTMLInputElement)?.value;

                    if (!range) {
                      toast.error('Please specify a range');
                      return;
                    }

                    addCondFormatRule({
                      range: range.toUpperCase(),
                      conditionType: condition,
                      value1,
                      value2,
                      format: {
                        backgroundColor: bgColor,
                        textColor: textColor,
                      },
                    });

                    // Clear form
                    (document.getElementById('condFormat-range') as HTMLInputElement).value = '';
                    (document.getElementById('condFormat-value1') as HTMLInputElement).value = '';
                    (document.getElementById('condFormat-value2') as HTMLInputElement).value = '';
                  }}
                  className="mt-4 w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500"
                >
                  Add Rule
                </button>
              </div>

              <div className="flex justify-end mt-4">
                <button
                  onClick={() => { setShowCondFormat(false); setEditingRule(null); }}
                  className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
