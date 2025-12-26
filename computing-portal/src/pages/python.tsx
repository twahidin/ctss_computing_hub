import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useSession } from 'next-auth/react';
import { FiPlay, FiSave, FiDownload, FiPlus, FiTrash2, FiChevronDown } from 'react-icons/fi';
import toast from 'react-hot-toast';

interface NotebookCell {
  id: string;
  type: 'code' | 'markdown';
  content: string;
  output?: string;
  isRunning?: boolean;
}

export default function PythonLab() {
  const { data: session } = useSession();
  const [cells, setCells] = useState<NotebookCell[]>([
    {
      id: '1',
      type: 'markdown',
      content: '# Welcome to Python Lab\n\nStart writing your Python code below.',
    },
    {
      id: '2',
      type: 'code',
      content: '# Example: Print Hello World\nprint("Hello, Computing 7155!")',
      output: '',
    },
  ]);
  const [activeCell, setActiveCell] = useState<string | null>('2');
  const [showTemplates, setShowTemplates] = useState(false);

  const codeTemplates = [
    {
      name: 'Variables and Data Types',
      code: `# Variables and Data Types
name = "Student"
age = 16
score = 85.5
is_passed = True

print(f"Name: {name}")
print(f"Age: {age}")
print(f"Score: {score}")
print(f"Passed: {is_passed}")`,
    },
    {
      name: 'List Operations',
      code: `# List Operations
numbers = [5, 2, 8, 1, 9, 3]

# Find min and max without using min()/max()
minimum = numbers[0]
maximum = numbers[0]

for num in numbers:
    if num < minimum:
        minimum = num
    if num > maximum:
        maximum = num

print(f"List: {numbers}")
print(f"Minimum: {minimum}")
print(f"Maximum: {maximum}")`,
    },
    {
      name: 'String Manipulation',
      code: `# String Manipulation
text = "Hello, Computing 7155!"

# Length
print(f"Length: {len(text)}")

# Uppercase/Lowercase
print(f"Upper: {text.upper()}")
print(f"Lower: {text.lower()}")

# Slicing
print(f"First 5 chars: {text[:5]}")
print(f"Last 5 chars: {text[-5:]}")

# Find substring
print(f"Position of 'Computing': {text.find('Computing')}")`,
    },
    {
      name: 'File I/O',
      code: `# File I/O Operations
# Writing to a file
with open("output.txt", "w") as f:
    f.write("Line 1\\n")
    f.write("Line 2\\n")
    f.write("Line 3\\n")

# Reading from a file
with open("output.txt", "r") as f:
    content = f.read()
    print("File contents:")
    print(content)`,
    },
    {
      name: 'User-Defined Function',
      code: `# User-Defined Functions
def calculate_average(numbers):
    """Calculate average without using sum()"""
    total = 0
    for num in numbers:
        total += num
    return total / len(numbers)

def is_valid_input(value, min_val, max_val):
    """Range check validation"""
    return min_val <= value <= max_val

# Test the functions
scores = [75, 82, 90, 68, 95]
avg = calculate_average(scores)
print(f"Average score: {avg:.2f}")

test_score = 85
if is_valid_input(test_score, 0, 100):
    print(f"{test_score} is a valid score")`,
    },
  ];

  const addCell = (type: 'code' | 'markdown') => {
    const newCell: NotebookCell = {
      id: Date.now().toString(),
      type,
      content: type === 'code' ? '# Your code here\n' : '## New Section\n',
      output: '',
    };
    setCells([...cells, newCell]);
    setActiveCell(newCell.id);
  };

  const deleteCell = (id: string) => {
    if (cells.length <= 1) {
      toast.error('Cannot delete the last cell');
      return;
    }
    setCells(cells.filter((cell) => cell.id !== id));
    if (activeCell === id) {
      setActiveCell(cells[0].id);
    }
  };

  const updateCell = (id: string, content: string) => {
    setCells(
      cells.map((cell) =>
        cell.id === id ? { ...cell, content } : cell
      )
    );
  };

  const runCell = async (id: string) => {
    const cell = cells.find((c) => c.id === id);
    if (!cell || cell.type !== 'code') return;

    setCells(
      cells.map((c) =>
        c.id === id ? { ...c, isRunning: true, output: '' } : c
      )
    );

    try {
      // In production, this would call the JupyterHub API
      // For now, we'll simulate output
      const response = await fetch('/api/python/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: cell.content }),
      });

      const data = await response.json();
      
      setCells(
        cells.map((c) =>
          c.id === id
            ? { ...c, isRunning: false, output: data.output || data.error }
            : c
        )
      );
    } catch (error) {
      setCells(
        cells.map((c) =>
          c.id === id
            ? { ...c, isRunning: false, output: 'Error: Could not execute code. Make sure JupyterHub is running.' }
            : c
        )
      );
    }
  };

  const loadTemplate = (code: string) => {
    const newCell: NotebookCell = {
      id: Date.now().toString(),
      type: 'code',
      content: code,
      output: '',
    };
    setCells([...cells, newCell]);
    setActiveCell(newCell.id);
    setShowTemplates(false);
    toast.success('Template loaded!');
  };

  const saveNotebook = async () => {
    try {
      await fetch('/api/notebooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'My Notebook',
          content: { cells },
          module: 2,
        }),
      });
      toast.success('Notebook saved!');
    } catch (error) {
      toast.error('Failed to save notebook');
    }
  };

  return (
    <>
      <Head>
        <title>Python Lab | Computing 7155 Portal</title>
      </Head>

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🐍 Python Lab</h1>
            <p className="text-gray-600 mt-1">
              Write, run, and test your Python code
            </p>
          </div>
          <div className="flex items-center space-x-3 mt-4 sm:mt-0">
            <div className="relative">
              <button
                onClick={() => setShowTemplates(!showTemplates)}
                className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Templates
                <FiChevronDown className="ml-2" />
              </button>
              {showTemplates && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                  {codeTemplates.map((template, index) => (
                    <button
                      key={index}
                      onClick={() => loadTemplate(template.code)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
                    >
                      {template.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={saveNotebook}
              className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <FiSave className="mr-2" />
              Save
            </button>
          </div>
        </div>

        {/* Notebook Cells */}
        <div className="space-y-4">
          {cells.map((cell, index) => (
            <div
              key={cell.id}
              className={`bg-white rounded-xl border-2 transition-colors ${
                activeCell === cell.id
                  ? 'border-primary-400'
                  : 'border-gray-200'
              }`}
              onClick={() => setActiveCell(cell.id)}
            >
              {/* Cell Header */}
              <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 bg-gray-50 rounded-t-xl">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-medium text-gray-500">
                    [{index + 1}]
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      cell.type === 'code'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {cell.type}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  {cell.type === 'code' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        runCell(cell.id);
                      }}
                      disabled={cell.isRunning}
                      className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors disabled:opacity-50"
                      title="Run cell"
                    >
                      <FiPlay size={16} />
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteCell(cell.id);
                    }}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Delete cell"
                  >
                    <FiTrash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Cell Content */}
              <div className="p-4">
                <textarea
                  value={cell.content}
                  onChange={(e) => updateCell(cell.id, e.target.value)}
                  className={`w-full min-h-[120px] p-3 font-mono text-sm rounded-lg resize-y ${
                    cell.type === 'code'
                      ? 'bg-gray-900 text-green-400'
                      : 'bg-gray-50 text-gray-800'
                  }`}
                  placeholder={
                    cell.type === 'code'
                      ? '# Enter your Python code...'
                      : '# Enter markdown...'
                  }
                />
              </div>

              {/* Cell Output */}
              {cell.type === 'code' && (cell.output || cell.isRunning) && (
                <div className="px-4 pb-4">
                  <div className="bg-gray-100 rounded-lg p-3 font-mono text-sm">
                    <div className="text-xs text-gray-500 mb-2">Output:</div>
                    {cell.isRunning ? (
                      <div className="flex items-center text-gray-600">
                        <div className="spinner w-4 h-4 mr-2"></div>
                        Running...
                      </div>
                    ) : (
                      <pre className="whitespace-pre-wrap text-gray-800">
                        {cell.output}
                      </pre>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add Cell Buttons */}
        <div className="flex items-center justify-center space-x-4 mt-6">
          <button
            onClick={() => addCell('code')}
            className="flex items-center px-4 py-2 border-2 border-dashed border-gray-300 text-gray-600 rounded-lg hover:border-green-400 hover:text-green-600 transition-colors"
          >
            <FiPlus className="mr-2" />
            Add Code Cell
          </button>
          <button
            onClick={() => addCell('markdown')}
            className="flex items-center px-4 py-2 border-2 border-dashed border-gray-300 text-gray-600 rounded-lg hover:border-blue-400 hover:text-blue-600 transition-colors"
          >
            <FiPlus className="mr-2" />
            Add Markdown Cell
          </button>
        </div>

        {/* Python Quick Reference */}
        <div className="mt-8 bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            📘 Quick Reference (7155 Syllabus)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Data Types</h3>
              <code className="text-xs bg-gray-100 p-2 rounded block">
                int, float, bool, str, list, dict
              </code>
            </div>
            <div>
              <h3 className="font-medium text-gray-700 mb-2">String Methods</h3>
              <code className="text-xs bg-gray-100 p-2 rounded block">
                .upper() .lower() .find() .split()
              </code>
            </div>
            <div>
              <h3 className="font-medium text-gray-700 mb-2">List Methods</h3>
              <code className="text-xs bg-gray-100 p-2 rounded block">
                len() min() max() sum()
              </code>
            </div>
            <div>
              <h3 className="font-medium text-gray-700 mb-2">File I/O</h3>
              <code className="text-xs bg-gray-100 p-2 rounded block">
                open() .read() .write() .close()
              </code>
            </div>
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Math Module</h3>
              <code className="text-xs bg-gray-100 p-2 rounded block">
                ceil() floor() sqrt() trunc()
              </code>
            </div>
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Random Module</h3>
              <code className="text-xs bg-gray-100 p-2 rounded block">
                randint() random()
              </code>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
