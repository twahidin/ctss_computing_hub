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

interface Selection {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

// ============================================
// FORMULA EVALUATION ENGINE - 7155 SYLLABUS
// ============================================

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

// Adjust cell references in formula when copying
const adjustFormula = (formula: string, rowDelta: number, colDelta: number): string => {
  if (!formula.startsWith('=')) return formula;
  
  return formula.replace(/([A-Z]+)(\d+)/g, (match, col, row) => {
    const colIndex = col.charCodeAt(0) - 65 + colDelta;
    const rowIndex = parseInt(row) - 1 + rowDelta;
    
    if (colIndex < 0 || colIndex >= COLS || rowIndex < 0 || rowIndex >= ROWS) {
      return match; // Keep original if out of bounds
    }
    
    return `${String.fromCharCode(65 + colIndex)}${rowIndex + 1}`;
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

    // Replace cell references with values
    let evalExpr = expr.toUpperCase();
    const cellRefs = evalExpr.match(/[A-Z]+\d+/g) || [];
    for (const ref of cellRefs) {
      const pos = parseCellRef(ref);
      if (pos) {
        const id = getCellId(pos[0], pos[1]);
        if (visited.has(id)) return '#CIRC!';
        const newVisited = new Set(Array.from(visited));
        newVisited.add(id);
        const cellVal = data[id]?.value || '0';
        const resolved = cellVal.startsWith('=') ? evaluateFormula(cellVal, data, newVisited) : cellVal;
        evalExpr = evalExpr.replace(new RegExp(ref, 'g'), getNumericValue(resolved).toString());
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

// Helper: resolve a value (cell ref or literal)
const resolveValue = (val: string, data: SheetData, visited: Set<string>): string => {
  const trimmed = val.trim();
  const ref = parseCellRef(trimmed.toUpperCase());
  if (ref) {
    return getCellValue(getCellId(ref[0], ref[1]), data, visited);
  }
  return trimmed;
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
// TEMPLATES
// ============================================
const spreadsheetTemplates: { name: string; description: string; category: string; data: SheetData }[] = [
  {
    name: 'Statistical Functions',
    description: 'SUM, AVERAGE, COUNT, MIN, MAX, MEDIAN',
    category: 'Statistical',
    data: {
      'A1': { value: 'Student' }, 'B1': { value: 'Score' },
      'A2': { value: 'Alice' }, 'B2': { value: '85' },
      'A3': { value: 'Bob' }, 'B3': { value: '72' },
      'A4': { value: 'Charlie' }, 'B4': { value: '91' },
      'A5': { value: 'Diana' }, 'B5': { value: '68' },
      'A6': { value: 'Eve' }, 'B6': { value: '95' },
      'D1': { value: 'Function' }, 'E1': { value: 'Result' },
      'D2': { value: 'SUM' }, 'E2': { value: '=SUM(B2:B6)' },
      'D3': { value: 'AVERAGE' }, 'E3': { value: '=AVERAGE(B2:B6)' },
      'D4': { value: 'COUNT' }, 'E4': { value: '=COUNT(B2:B6)' },
      'D5': { value: 'MIN' }, 'E5': { value: '=MIN(B2:B6)' },
      'D6': { value: 'MAX' }, 'E6': { value: '=MAX(B2:B6)' },
      'D7': { value: 'MEDIAN' }, 'E7': { value: '=MEDIAN(B2:B6)' },
    },
  },
  {
    name: 'Conditional Functions',
    description: 'IF, AND, OR, NOT',
    category: 'Logical',
    data: {
      'A1': { value: 'Student' }, 'B1': { value: 'Score' }, 'C1': { value: 'Pass?' }, 'D1': { value: 'Grade' },
      'A2': { value: 'Alice' }, 'B2': { value: '85' }, 'C2': { value: '=IF(B2>=50,"Pass","Fail")' }, 'D2': { value: '=IF(B2>=80,"A",IF(B2>=60,"B","C"))' },
      'A3': { value: 'Bob' }, 'B3': { value: '42' }, 'C3': { value: '=IF(B3>=50,"Pass","Fail")' }, 'D3': { value: '=IF(B3>=80,"A",IF(B3>=60,"B","C"))' },
      'A4': { value: 'Charlie' }, 'B4': { value: '91' }, 'C4': { value: '=IF(B4>=50,"Pass","Fail")' }, 'D4': { value: '=IF(B4>=80,"A",IF(B4>=60,"B","C"))' },
    },
  },
  {
    name: 'Drag Fill Demo',
    description: 'Try dragging the blue handle to copy formulas',
    category: 'Practice',
    data: {
      'A1': { value: 'Number' }, 'B1': { value: 'Square' }, 'C1': { value: 'Double' },
      'A2': { value: '1' }, 'B2': { value: '=A2^2' }, 'C2': { value: '=A2*2' },
      'A3': { value: '2' },
      'A4': { value: '3' },
      'A5': { value: '4' },
      'A6': { value: '5' },
      'E2': { value: 'Try this:' },
      'E3': { value: '1. Select B2' },
      'E4': { value: '2. Drag blue square down to B6' },
      'E5': { value: '3. Formulas auto-adjust!' },
    },
  },
  {
    name: 'VLOOKUP Practice',
    description: 'Vertical lookup from tables',
    category: 'Lookup',
    data: {
      'A1': { value: 'ID' }, 'B1': { value: 'Name' }, 'C1': { value: 'Dept' }, 'D1': { value: 'Salary' },
      'A2': { value: '101' }, 'B2': { value: 'Alice' }, 'C2': { value: 'IT' }, 'D2': { value: '5000' },
      'A3': { value: '102' }, 'B3': { value: 'Bob' }, 'C3': { value: 'HR' }, 'D3': { value: '4500' },
      'A4': { value: '103' }, 'B4': { value: 'Charlie' }, 'C4': { value: 'IT' }, 'D4': { value: '5500' },
      'F1': { value: 'Lookup ID:' }, 'G1': { value: '102' },
      'F2': { value: 'Name:' }, 'G2': { value: '=VLOOKUP(G1,A2:D4,2,FALSE)' },
      'F3': { value: 'Salary:' }, 'G3': { value: '=VLOOKUP(G1,A2:D4,4,FALSE)' },
    },
  },
  {
    name: 'Text Functions',
    description: 'LEFT, RIGHT, MID, LEN, CONCAT',
    category: 'Text',
    data: {
      'A1': { value: 'Full Name' },
      'A2': { value: 'John Smith' },
      'C1': { value: 'Function' }, 'D1': { value: 'Result' },
      'C2': { value: 'LEFT(A2,4)' }, 'D2': { value: '=LEFT(A2,4)' },
      'C3': { value: 'RIGHT(A2,5)' }, 'D3': { value: '=RIGHT(A2,5)' },
      'C4': { value: 'MID(A2,6,5)' }, 'D4': { value: '=MID(A2,6,5)' },
      'C5': { value: 'LEN(A2)' }, 'D5': { value: '=LEN(A2)' },
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
  
  const gridRef = useRef<HTMLDivElement>(null);

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
          <div className="flex items-center space-x-2 mt-3 sm:mt-0">
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
          <div className="px-3 py-2 bg-slate-700 text-slate-300 font-mono text-sm min-w-[50px] text-center border-r border-slate-600">
            {selectionBounds ? `${getCellId(selectionBounds.minRow, selectionBounds.minCol)}${selectionBounds.minRow !== selectionBounds.maxRow || selectionBounds.minCol !== selectionBounds.maxCol ? ':' + getCellId(selectionBounds.maxRow, selectionBounds.maxCol) : ''}` : '—'}
          </div>
          <input type="text" value={selectedValue} onChange={(e) => selectedCellId && handleCellChange(selectedCellId, e.target.value)} onFocus={() => selectedCellId && setEditingCell(selectedCellId)} className="flex-1 px-3 py-2 bg-slate-800 text-white font-mono text-sm outline-none" placeholder="Select a cell..." />
        </div>

        {/* Help Panel */}
        {showHelp && (
          <div className="mb-3 bg-slate-800/80 backdrop-blur rounded-xl border border-slate-700/50 p-3 text-xs">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-2">
              <div><span className="text-emerald-400 font-semibold">Click+Drag:</span> <span className="text-slate-400">Select range</span></div>
              <div><span className="text-blue-400 font-semibold">Blue Handle:</span> <span className="text-slate-400">Drag to fill/copy</span></div>
              <div><span className="text-purple-400 font-semibold">Ctrl+C/V:</span> <span className="text-slate-400">Copy/Paste</span></div>
            </div>
            <p className="text-slate-500">Functions: SUM, AVERAGE, COUNT, IF, VLOOKUP, INDEX, MATCH, LEFT, RIGHT, MID, and more!</p>
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
                          ${isInSelection && !isInFillPreview ? 'bg-blue-50' : 'bg-white'}
                          ${isActiveCell ? 'outline outline-2 outline-blue-500 outline-offset-[-1px]' : ''}
                        `}
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
                          <div className={`w-full h-full px-2 text-sm flex items-center truncate ${isError ? 'text-red-500 font-medium' : ''}`}>
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
      </div>
    </>
  );
}
