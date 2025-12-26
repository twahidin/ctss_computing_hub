import { Module } from '@/types';

export const syllabusModules: Module[] = [
  {
    id: 1,
    name: 'Computing Fundamentals',
    description: 'Computer architecture, data representation, and logic gates',
    color: 'bg-blue-500',
    icon: '💻',
    topics: [
      {
        id: '1.1',
        name: 'Computer Architecture',
        learningOutcomes: [
          'Perform calculations using bits, bytes, kilobytes, kibibytes, megabytes, mebibytes, gigabytes, gibibytes, terabytes, tebibytes, petabytes and pebibytes',
          'Describe the function of key components: processor, main memory and secondary storage',
          'Describe the function of data and address buses in reading from and writing to memory',
          'Describe different input/output interfaces (USB, HDMI and PCI Express)',
          'Describe the use of magnetic, optical and solid-state media for secondary storage',
        ],
        exercises: [
          { id: 'ex-1.1.1', title: 'Data Unit Conversions', type: 'quiz', difficulty: 'easy', estimatedTime: 10 },
          { id: 'ex-1.1.2', title: 'Computer Components Quiz', type: 'quiz', difficulty: 'medium', estimatedTime: 15 },
        ],
      },
      {
        id: '1.2',
        name: 'Data Representation',
        learningOutcomes: [
          'Represent positive whole numbers in binary form',
          'Convert positive whole numbers between binary, denary and hexadecimal',
          "Use two's complement for positive and negative whole numbers",
          'Use 8-bit extended ASCII encoding for English text',
        ],
        exercises: [
          { id: 'ex-1.2.1', title: 'Binary Conversion Practice', type: 'notebook', difficulty: 'easy', estimatedTime: 20 },
          { id: 'ex-1.2.2', title: "Two's Complement Calculator", type: 'notebook', difficulty: 'medium', estimatedTime: 25 },
          { id: 'ex-1.2.3', title: 'Number Systems Quiz', type: 'quiz', difficulty: 'hard', estimatedTime: 15 },
        ],
      },
      {
        id: '1.3',
        name: 'Logic Gates',
        learningOutcomes: [
          'Represent logic circuits using logic circuit diagrams or Boolean statements',
          'Construct truth tables for logic circuits (maximum 3 inputs)',
          'Draw symbols and construct truth tables for AND, OR, NOT, NAND, NOR and XOR gates',
          "Manipulate Boolean statements using associative, distributive properties and De Morgan's theorem",
          'Solve system problems using combinations of logic gates',
        ],
        exercises: [
          { id: 'ex-1.3.1', title: 'Truth Table Builder', type: 'notebook', difficulty: 'medium', estimatedTime: 30 },
          { id: 'ex-1.3.2', title: 'Boolean Algebra Practice', type: 'quiz', difficulty: 'hard', estimatedTime: 20 },
        ],
      },
    ],
  },
  {
    id: 2,
    name: 'Algorithms and Programming',
    description: 'Python programming, problem analysis, and algorithm design',
    color: 'bg-green-500',
    icon: '🐍',
    topics: [
      {
        id: '2.1',
        name: 'Problem Analysis',
        learningOutcomes: [
          'Identify and remove unnecessary details to specify inputs and requirements',
          'Specify outputs and requirements for correct outputs',
        ],
        exercises: [
          { id: 'ex-2.1.1', title: 'Problem Decomposition', type: 'notebook', difficulty: 'easy', estimatedTime: 15 },
        ],
      },
      {
        id: '2.2',
        name: 'Constructs',
        learningOutcomes: [
          'Interpret flowcharts to understand sequence, selection and iteration constructs',
        ],
        exercises: [
          { id: 'ex-2.2.1', title: 'Flowchart Interpretation', type: 'quiz', difficulty: 'easy', estimatedTime: 15 },
        ],
      },
      {
        id: '2.3',
        name: 'Python Code',
        learningOutcomes: [
          'Use variables to store and retrieve values',
          'Use literals to represent values directly in code',
          'Use input() and print() for interactive I/O',
          'Use open(), read(), readline(), write() and close() for file I/O',
          'Use import command to load modules',
          'Use Boolean values with or, and, not operators',
          'Use integer and floating-point values with operators and functions',
          'Use string values with operators, functions and methods',
          'Use list values with operators, functions and methods',
          'Use dictionary values for insertion, query, lookup and deletion',
          'Use if, elif, else for selection constructs',
          'Use for and while for iteration constructs',
          'Write and call user-defined functions with parameters and return values',
          'Distinguish between local and global variables',
        ],
        exercises: [
          { id: 'ex-2.3.1', title: 'Variables and Data Types', type: 'notebook', difficulty: 'easy', estimatedTime: 20 },
          { id: 'ex-2.3.2', title: 'String Manipulation', type: 'coding', difficulty: 'medium', estimatedTime: 30 },
          { id: 'ex-2.3.3', title: 'List Operations', type: 'coding', difficulty: 'medium', estimatedTime: 30 },
          { id: 'ex-2.3.4', title: 'Dictionary Practice', type: 'coding', difficulty: 'medium', estimatedTime: 25 },
          { id: 'ex-2.3.5', title: 'File I/O Operations', type: 'notebook', difficulty: 'hard', estimatedTime: 35 },
          { id: 'ex-2.3.6', title: 'Functions and Scope', type: 'coding', difficulty: 'hard', estimatedTime: 40 },
        ],
      },
      {
        id: '2.4',
        name: 'Testing and Debugging',
        learningOutcomes: [
          'Produce trace tables by performing manual dry runs',
          'Inspect variables using print statements',
          'Locate logic errors by backtracking',
          'Test programs incrementally',
          'Test using commenting out techniques',
          'Perform data validation (length, range, presence, format, existence checks)',
          'Understand syntax, logic and run-time errors',
          'Design test cases for normal, error and boundary conditions',
        ],
        exercises: [
          { id: 'ex-2.4.1', title: 'Trace Table Practice', type: 'notebook', difficulty: 'medium', estimatedTime: 25 },
          { id: 'ex-2.4.2', title: 'Debug the Code', type: 'coding', difficulty: 'medium', estimatedTime: 30 },
          { id: 'ex-2.4.3', title: 'Input Validation', type: 'coding', difficulty: 'medium', estimatedTime: 25 },
          { id: 'ex-2.4.4', title: 'Test Case Design', type: 'quiz', difficulty: 'hard', estimatedTime: 20 },
        ],
      },
      {
        id: '2.5',
        name: 'Algorithm Design',
        learningOutcomes: [
          'Find minimum/maximum values in a list without min()/max()',
          'Calculate sum/average without sum()',
          'Search for items without index()/find()',
          'Extract items based on criteria',
          'Split strings without split()',
          'Solve problems using modular approach',
          'Solve problems using incremental approach',
          'Identify generic steps from manual problem solving',
          'Adapt solutions from similar problems',
        ],
        exercises: [
          { id: 'ex-2.5.1', title: 'Find Min/Max Algorithm', type: 'coding', difficulty: 'easy', estimatedTime: 20 },
          { id: 'ex-2.5.2', title: 'Linear Search Implementation', type: 'coding', difficulty: 'medium', estimatedTime: 25 },
          { id: 'ex-2.5.3', title: 'String Splitting Algorithm', type: 'coding', difficulty: 'hard', estimatedTime: 35 },
          { id: 'ex-2.5.4', title: 'Modular Problem Solving', type: 'notebook', difficulty: 'hard', estimatedTime: 40 },
        ],
      },
      {
        id: '2.6',
        name: 'Software Engineering',
        learningOutcomes: [
          'Understand stages: gather requirements, design, write code, test, deploy',
          'Recognise iterative development approaches',
        ],
        exercises: [
          { id: 'ex-2.6.1', title: 'SDLC Quiz', type: 'quiz', difficulty: 'easy', estimatedTime: 10 },
        ],
      },
    ],
  },
  {
    id: 3,
    name: 'Spreadsheets',
    description: 'Excel functions, formulas, and data analysis',
    color: 'bg-emerald-500',
    icon: '📊',
    topics: [
      {
        id: '3.1',
        name: 'Program Features',
        learningOutcomes: [
          'Use relative, absolute and mixed cell references',
          'Use Goal Seek feature',
          'Use Conditional Formatting feature',
        ],
        exercises: [
          { id: 'ex-3.1.1', title: 'Cell References Practice', type: 'spreadsheet', difficulty: 'easy', estimatedTime: 20 },
          { id: 'ex-3.1.2', title: 'Goal Seek Exercise', type: 'spreadsheet', difficulty: 'medium', estimatedTime: 25 },
          { id: 'ex-3.1.3', title: 'Conditional Formatting', type: 'spreadsheet', difficulty: 'medium', estimatedTime: 20 },
        ],
      },
      {
        id: '3.2',
        name: 'Functions',
        learningOutcomes: [
          'Use logical functions: OR, AND, NOT, IF',
          'Use mathematical functions: SUM, SUMIF, ROUND, SQRT, MOD, POWER',
          'Use statistical functions: AVERAGE, AVERAGEIF, COUNT, COUNTA, COUNTIF, MAX, MIN, MEDIAN, MODE, RANK, LARGE, SMALL',
          'Use text functions: LEFT, MID, RIGHT, LEN, CONCAT, FIND, SEARCH',
          'Use lookup functions: VLOOKUP, HLOOKUP, INDEX, MATCH',
          'Use date functions: TODAY, NOW, DAYS',
        ],
        exercises: [
          { id: 'ex-3.2.1', title: 'Logical Functions', type: 'spreadsheet', difficulty: 'easy', estimatedTime: 25 },
          { id: 'ex-3.2.2', title: 'Mathematical Functions', type: 'spreadsheet', difficulty: 'medium', estimatedTime: 30 },
          { id: 'ex-3.2.3', title: 'Statistical Analysis', type: 'spreadsheet', difficulty: 'medium', estimatedTime: 30 },
          { id: 'ex-3.2.4', title: 'Text Functions Practice', type: 'spreadsheet', difficulty: 'medium', estimatedTime: 25 },
          { id: 'ex-3.2.5', title: 'VLOOKUP Mastery', type: 'spreadsheet', difficulty: 'hard', estimatedTime: 35 },
          { id: 'ex-3.2.6', title: 'INDEX-MATCH Combo', type: 'spreadsheet', difficulty: 'hard', estimatedTime: 40 },
          { id: 'ex-3.2.7', title: 'Comprehensive Spreadsheet Project', type: 'spreadsheet', difficulty: 'hard', estimatedTime: 60 },
        ],
      },
    ],
  },
  {
    id: 4,
    name: 'Networking',
    description: 'Network concepts, home networks, and security',
    color: 'bg-purple-500',
    icon: '🌐',
    topics: [
      {
        id: '4.1',
        name: 'Concepts',
        learningOutcomes: [
          'Define computer networks as systems for data exchange',
          'Describe wired vs wireless transmission media',
          'Differentiate LANs and WANs',
          'Compare client-server and peer-to-peer architectures',
          'Identify star and mesh topologies',
          'Define protocols as communication standards',
          'Explain packet transmission in LANs',
          'Explain error detection: parity, checksums, echo checks, ARQ',
        ],
        exercises: [
          { id: 'ex-4.1.1', title: 'Network Basics Quiz', type: 'quiz', difficulty: 'easy', estimatedTime: 15 },
          { id: 'ex-4.1.2', title: 'Topologies and Architectures', type: 'quiz', difficulty: 'medium', estimatedTime: 15 },
        ],
      },
      {
        id: '4.2',
        name: 'Home Networks and the Internet',
        learningOutcomes: [
          'Explain home networks as LANs and internet as WAN',
          'Explain modem function for ISP connection',
          'Explain network interface controllers',
          'Explain MAC addresses vs IP addresses',
          'Compare MAC, IPv4 and IPv6 addresses',
          'Connect router, switch, wireless AP correctly',
        ],
        exercises: [
          { id: 'ex-4.2.1', title: 'Home Network Design', type: 'quiz', difficulty: 'medium', estimatedTime: 20 },
          { id: 'ex-4.2.2', title: 'IP Addressing Quiz', type: 'quiz', difficulty: 'medium', estimatedTime: 15 },
        ],
      },
      {
        id: '4.3',
        name: 'Security and Privacy',
        learningOutcomes: [
          'Compare security vs privacy',
          'Explain human actions as threats',
          'Explain anti-malware programs',
          'Explain firewalls',
          'Explain encryption',
          'Explain PDPA requirements',
          'Explain adware, spyware, cookies threats',
          'Explain phishing and pharming',
          'Describe good computing practices',
          'Analyse effects of security measures',
        ],
        exercises: [
          { id: 'ex-4.3.1', title: 'Security Threats Quiz', type: 'quiz', difficulty: 'easy', estimatedTime: 15 },
          { id: 'ex-4.3.2', title: 'Privacy and PDPA', type: 'quiz', difficulty: 'medium', estimatedTime: 15 },
          { id: 'ex-4.3.3', title: 'Security Analysis Case Study', type: 'notebook', difficulty: 'hard', estimatedTime: 30 },
        ],
      },
    ],
  },
  {
    id: 5,
    name: 'Impact of Computing',
    description: 'Ethics, intellectual property, and emerging technologies',
    color: 'bg-orange-500',
    icon: '🌍',
    topics: [
      {
        id: '5.1',
        name: 'General',
        learningOutcomes: [
          'Give examples of computing impact: communication, education, transportation, retail',
        ],
        exercises: [
          { id: 'ex-5.1.1', title: 'Computing Impact Discussion', type: 'quiz', difficulty: 'easy', estimatedTime: 10 },
        ],
      },
      {
        id: '5.2',
        name: 'Intellectual Property',
        learningOutcomes: [
          'Define intellectual property',
          'Describe copyright under Copyright Act',
          'Explain software licenses',
          'Distinguish proprietary, freeware, shareware, FOSS',
          'Recognise software piracy',
        ],
        exercises: [
          { id: 'ex-5.2.1', title: 'IP and Copyright Quiz', type: 'quiz', difficulty: 'easy', estimatedTime: 15 },
          { id: 'ex-5.2.2', title: 'Software Licensing', type: 'quiz', difficulty: 'medium', estimatedTime: 15 },
        ],
      },
      {
        id: '5.3',
        name: 'Communication',
        learningOutcomes: [
          'Explain social media engagement and falsehoods',
          'Explain POFMA for fake news',
        ],
        exercises: [
          { id: 'ex-5.3.1', title: 'Social Media and POFMA Quiz', type: 'quiz', difficulty: 'medium', estimatedTime: 15 },
        ],
      },
      {
        id: '5.4',
        name: 'Emerging Technologies',
        learningOutcomes: [
          'Describe AI capabilities',
          'Give examples of AI tasks: face recognition, voice recognition, image classification, spam filtering',
          'Define Machine Learning and compare to traditional programming',
          'Use nearest neighbour method for classification',
          'Explain unethical AI use and biased data consequences',
        ],
        exercises: [
          { id: 'ex-5.4.1', title: 'AI and ML Concepts Quiz', type: 'quiz', difficulty: 'easy', estimatedTime: 15 },
          { id: 'ex-5.4.2', title: 'Nearest Neighbour Classification', type: 'notebook', difficulty: 'medium', estimatedTime: 30 },
          { id: 'ex-5.4.3', title: 'AI Ethics Discussion', type: 'quiz', difficulty: 'medium', estimatedTime: 15 },
        ],
      },
    ],
  },
];

export default syllabusModules;
