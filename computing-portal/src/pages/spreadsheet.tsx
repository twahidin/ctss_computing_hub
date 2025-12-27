import { useState } from 'react';
import Head from 'next/head';
import { FiSave, FiHelpCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';
import SimpleSpreadsheet from '@/components/SimpleSpreadsheet';

export default function SpreadsheetPage() {
  const [showHelp, setShowHelp] = useState(false);

  const handleSave = async () => {
    toast.success('Spreadsheet saved! (Save functionality coming soon)');
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
                  SUM, SUMIF, ROUND, INT, MOD
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
        <div className="h-[calc(100%-120px)]">
          <SimpleSpreadsheet rows={30} cols={15} />
        </div>
      </div>
    </>
  );
}
