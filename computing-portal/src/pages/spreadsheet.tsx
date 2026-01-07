import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import { FiSave, FiDownload, FiUpload, FiHelpCircle, FiChevronDown } from 'react-icons/fi';
import toast from 'react-hot-toast';

// Dynamically import FortuneSheet to avoid SSR issues
const Workbook = dynamic(
  () => import('@fortune-sheet/react').then((mod) => mod.Workbook),
  { ssr: false }
);

// Sample data templates for 7155 syllabus exercises
const spreadsheetTemplates = [
  {
    name: 'VLOOKUP Practice',
    description: 'Practice using VLOOKUP for exact matching',
    data: [
      {
        name: 'Student Grades',
        celldata: [
          { r: 0, c: 0, v: { v: 'Student ID', m: 'Student ID', ct: { fa: 'General', t: 'g' } } },
          { r: 0, c: 1, v: { v: 'Name', m: 'Name', ct: { fa: 'General', t: 'g' } } },
          { r: 0, c: 2, v: { v: 'Score', m: 'Score', ct: { fa: 'General', t: 'g' } } },
          { r: 0, c: 3, v: { v: 'Grade', m: 'Grade', ct: { fa: 'General', t: 'g' } } },
          { r: 1, c: 0, v: { v: 'S001', m: 'S001' } },
          { r: 1, c: 1, v: { v: 'Alice', m: 'Alice' } },
          { r: 1, c: 2, v: { v: 85, m: '85', ct: { fa: '0', t: 'n' } } },
          { r: 2, c: 0, v: { v: 'S002', m: 'S002' } },
          { r: 2, c: 1, v: { v: 'Bob', m: 'Bob' } },
          { r: 2, c: 2, v: { v: 72, m: '72', ct: { fa: '0', t: 'n' } } },
          { r: 2, c: 0, v: { v: 'S003', m: 'S003' } },
          { r: 3, c: 1, v: { v: 'Charlie', m: 'Charlie' } },
          { r: 3, c: 2, v: { v: 91, m: '91', ct: { fa: '0', t: 'n' } } },
          // Grade lookup table
          { r: 0, c: 5, v: { v: 'Min Score', m: 'Min Score', ct: { fa: 'General', t: 'g' } } },
          { r: 0, c: 6, v: { v: 'Grade', m: 'Grade', ct: { fa: 'General', t: 'g' } } },
          { r: 1, c: 5, v: { v: 0, m: '0', ct: { fa: '0', t: 'n' } } },
          { r: 1, c: 6, v: { v: 'F', m: 'F' } },
          { r: 2, c: 5, v: { v: 50, m: '50', ct: { fa: '0', t: 'n' } } },
          { r: 2, c: 6, v: { v: 'D', m: 'D' } },
          { r: 3, c: 5, v: { v: 60, m: '60', ct: { fa: '0', t: 'n' } } },
          { r: 3, c: 6, v: { v: 'C', m: 'C' } },
          { r: 4, c: 5, v: { v: 70, m: '70', ct: { fa: '0', t: 'n' } } },
          { r: 4, c: 6, v: { v: 'B', m: 'B' } },
          { r: 5, c: 5, v: { v: 80, m: '80', ct: { fa: '0', t: 'n' } } },
          { r: 5, c: 6, v: { v: 'A', m: 'A' } },
        ],
      },
    ],
  },
  {
    name: 'Statistical Functions',
    description: 'Practice SUM, AVERAGE, COUNT, MIN, MAX',
    data: [
      {
        name: 'Sales Data',
        celldata: [
          { r: 0, c: 0, v: { v: 'Month', m: 'Month' } },
          { r: 0, c: 1, v: { v: 'Sales', m: 'Sales' } },
          { r: 1, c: 0, v: { v: 'Jan', m: 'Jan' } },
          { r: 1, c: 1, v: { v: 1500, m: '1500', ct: { fa: '0', t: 'n' } } },
          { r: 2, c: 0, v: { v: 'Feb', m: 'Feb' } },
          { r: 2, c: 1, v: { v: 2300, m: '2300', ct: { fa: '0', t: 'n' } } },
          { r: 3, c: 0, v: { v: 'Mar', m: 'Mar' } },
          { r: 3, c: 1, v: { v: 1800, m: '1800', ct: { fa: '0', t: 'n' } } },
          { r: 4, c: 0, v: { v: 'Apr', m: 'Apr' } },
          { r: 4, c: 1, v: { v: 2100, m: '2100', ct: { fa: '0', t: 'n' } } },
          { r: 5, c: 0, v: { v: 'May', m: 'May' } },
          { r: 5, c: 1, v: { v: 2800, m: '2800', ct: { fa: '0', t: 'n' } } },
          { r: 7, c: 0, v: { v: 'Total:', m: 'Total:' } },
          { r: 8, c: 0, v: { v: 'Average:', m: 'Average:' } },
          { r: 9, c: 0, v: { v: 'Max:', m: 'Max:' } },
          { r: 10, c: 0, v: { v: 'Min:', m: 'Min:' } },
          { r: 11, c: 0, v: { v: 'Count:', m: 'Count:' } },
        ],
      },
    ],
  },
  {
    name: 'Conditional Functions',
    description: 'Practice IF, SUMIF, COUNTIF, AVERAGEIF',
    data: [
      {
        name: 'Inventory',
        celldata: [
          { r: 0, c: 0, v: { v: 'Product', m: 'Product' } },
          { r: 0, c: 1, v: { v: 'Category', m: 'Category' } },
          { r: 0, c: 2, v: { v: 'Price', m: 'Price' } },
          { r: 0, c: 3, v: { v: 'Stock', m: 'Stock' } },
          { r: 0, c: 4, v: { v: 'Status', m: 'Status' } },
          { r: 1, c: 0, v: { v: 'Laptop', m: 'Laptop' } },
          { r: 1, c: 1, v: { v: 'Electronics', m: 'Electronics' } },
          { r: 1, c: 2, v: { v: 1200, m: '1200', ct: { fa: '0', t: 'n' } } },
          { r: 1, c: 3, v: { v: 15, m: '15', ct: { fa: '0', t: 'n' } } },
          { r: 2, c: 0, v: { v: 'Mouse', m: 'Mouse' } },
          { r: 2, c: 1, v: { v: 'Electronics', m: 'Electronics' } },
          { r: 2, c: 2, v: { v: 25, m: '25', ct: { fa: '0', t: 'n' } } },
          { r: 2, c: 3, v: { v: 50, m: '50', ct: { fa: '0', t: 'n' } } },
          { r: 3, c: 0, v: { v: 'Desk', m: 'Desk' } },
          { r: 3, c: 1, v: { v: 'Furniture', m: 'Furniture' } },
          { r: 3, c: 2, v: { v: 300, m: '300', ct: { fa: '0', t: 'n' } } },
          { r: 3, c: 3, v: { v: 8, m: '8', ct: { fa: '0', t: 'n' } } },
          { r: 4, c: 0, v: { v: 'Chair', m: 'Chair' } },
          { r: 4, c: 1, v: { v: 'Furniture', m: 'Furniture' } },
          { r: 4, c: 2, v: { v: 150, m: '150', ct: { fa: '0', t: 'n' } } },
          { r: 4, c: 3, v: { v: 20, m: '20', ct: { fa: '0', t: 'n' } } },
        ],
      },
    ],
  },
  {
    name: 'Text Functions',
    description: 'Practice LEFT, RIGHT, MID, LEN, CONCAT',
    data: [
      {
        name: 'Text Processing',
        celldata: [
          { r: 0, c: 0, v: { v: 'Full Name', m: 'Full Name' } },
          { r: 0, c: 1, v: { v: 'First Name', m: 'First Name' } },
          { r: 0, c: 2, v: { v: 'Last Name', m: 'Last Name' } },
          { r: 0, c: 3, v: { v: 'Initials', m: 'Initials' } },
          { r: 1, c: 0, v: { v: 'John Smith', m: 'John Smith' } },
          { r: 2, c: 0, v: { v: 'Mary Johnson', m: 'Mary Johnson' } },
          { r: 3, c: 0, v: { v: 'David Lee', m: 'David Lee' } },
          { r: 5, c: 0, v: { v: 'Product Code', m: 'Product Code' } },
          { r: 5, c: 1, v: { v: 'Category', m: 'Category' } },
          { r: 5, c: 2, v: { v: 'Number', m: 'Number' } },
          { r: 6, c: 0, v: { v: 'ELEC-001', m: 'ELEC-001' } },
          { r: 7, c: 0, v: { v: 'FURN-042', m: 'FURN-042' } },
          { r: 8, c: 0, v: { v: 'BOOK-123', m: 'BOOK-123' } },
        ],
      },
    ],
  },
];

export default function SpreadsheetPage() {
  const [sheetData, setSheetData] = useState([
    {
      name: 'Sheet1',
      celldata: [],
      config: {},
    },
  ]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const loadTemplate = (template: typeof spreadsheetTemplates[0]) => {
    // Add config property to each sheet if missing
    const dataWithConfig = template.data.map(sheet => ({
      ...sheet,
      config: {},
    }));
    setSheetData(dataWithConfig);
    setShowTemplates(false);
    toast.success(`Loaded: ${template.name}`);
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
            <h1 className="text-2xl font-bold text-gray-900">📊 Spreadsheet</h1>
            <p className="text-gray-600 mt-1">
              Practice Excel functions for Module 3
            </p>
          </div>
          <div className="flex items-center space-x-3 mt-4 sm:mt-0">
            {/* Templates Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowTemplates(!showTemplates)}
                className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Templates
                <FiChevronDown className="ml-2" />
              </button>
              {showTemplates && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                  {spreadsheetTemplates.map((template, index) => (
                    <button
                      key={index}
                      onClick={() => loadTemplate(template)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
                    >
                      <div className="font-medium text-gray-900">
                        {template.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {template.description}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Help Button */}
            <button
              onClick={() => setShowHelp(!showHelp)}
              className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <FiHelpCircle className="mr-2" />
              Functions
            </button>

            {/* Save Button */}
            <button
              onClick={handleSave}
              className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <FiSave className="mr-2" />
              Save
            </button>
          </div>
        </div>

        {/* Help Panel */}
        {showHelp && (
          <div className="mb-4 bg-white rounded-xl border border-gray-200 p-4 max-h-60 overflow-y-auto">
            <h3 className="font-semibold text-gray-900 mb-3">
              7155 Syllabus Functions
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div>
                <h4 className="font-medium text-green-700 mb-1">Logical</h4>
                <p className="text-gray-600">IF, AND, OR, NOT</p>
              </div>
              <div>
                <h4 className="font-medium text-blue-700 mb-1">Math</h4>
                <p className="text-gray-600">
                  SUM, SUMIF, ROUND, SQRT, MOD, POWER
                </p>
              </div>
              <div>
                <h4 className="font-medium text-purple-700 mb-1">Statistical</h4>
                <p className="text-gray-600">
                  AVERAGE, AVERAGEIF, COUNT, COUNTIF, MAX, MIN, MEDIAN
                </p>
              </div>
              <div>
                <h4 className="font-medium text-orange-700 mb-1">Text</h4>
                <p className="text-gray-600">
                  LEFT, MID, RIGHT, LEN, CONCAT, FIND
                </p>
              </div>
              <div>
                <h4 className="font-medium text-red-700 mb-1">Lookup</h4>
                <p className="text-gray-600">VLOOKUP, HLOOKUP, INDEX, MATCH</p>
              </div>
              <div>
                <h4 className="font-medium text-teal-700 mb-1">Date</h4>
                <p className="text-gray-600">TODAY, NOW, DAYS</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-700 mb-1">More Stats</h4>
                <p className="text-gray-600">
                  MODE.SNGL, RANK.EQ, LARGE, SMALL
                </p>
              </div>
              <div>
                <h4 className="font-medium text-indigo-700 mb-1">Features</h4>
                <p className="text-gray-600">
                  Goal Seek, Conditional Formatting
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Spreadsheet Container */}
        <div className="fortune-sheet-container h-[calc(100%-120px)] bg-white">
          <Workbook
            data={sheetData}
            onChange={(data: any) => setSheetData(data)}
          />
        </div>
      </div>
    </>
  );
}
