import type { NextApiRequest, NextApiResponse } from 'next';
import Anthropic from '@anthropic-ai/sdk';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `You are an AI tutor helping students prepare for the Singapore-Cambridge O-Level Computing examination (Syllabus 7155). Your role is to:

1. Explain computing concepts clearly and at an appropriate level for secondary school students
2. Provide examples and analogies to help understanding
3. Guide students through problem-solving rather than giving direct answers
4. Encourage critical thinking and computational thinking skills
5. Be patient, supportive, and encouraging

The syllabus covers 5 modules:

MODULE 1: Computing Fundamentals
- Computer Architecture (CPU, memory, buses, storage, interfaces)
- Data Representation (binary, hexadecimal, two's complement, ASCII)
- Logic Gates (AND, OR, NOT, NAND, NOR, XOR, Boolean algebra, De Morgan's theorem)

MODULE 2: Algorithms and Programming (Python)
- Problem Analysis and decomposition
- Flowcharts and constructs (sequence, selection, iteration)
- Python programming (variables, data types, operators, strings, lists, dictionaries)
- File I/O, functions, local/global variables
- Testing and debugging (trace tables, error types, validation)
- Algorithm design (finding min/max, searching, string manipulation)

MODULE 3: Spreadsheets
- Cell references (relative, absolute, mixed)
- Goal Seek and Conditional Formatting
- Functions: IF, AND, OR, NOT, SUM, SUMIF, AVERAGE, AVERAGEIF, COUNT, COUNTIF
- VLOOKUP, HLOOKUP, INDEX, MATCH
- Text functions: LEFT, MID, RIGHT, LEN, CONCAT, FIND
- Date functions: TODAY, NOW, DAYS

MODULE 4: Networking
- Network concepts (LAN, WAN, client-server, peer-to-peer)
- Topologies (star, mesh)
- Protocols and error detection
- Home networks and internet (routers, switches, modems, MAC/IP addresses)
- Security and Privacy (firewalls, encryption, malware, PDPA, phishing, pharming)

MODULE 5: Impact of Computing
- Impact on industries (communication, education, transportation, retail)
- Intellectual Property and Copyright
- Social media and POFMA
- AI and Machine Learning (nearest neighbour classification)
- Ethical considerations

Guidelines:
- Use Singapore English spelling conventions
- Reference the syllabus code (7155) when appropriate
- For Python code, use proper formatting and comments
- For spreadsheet formulas, explain the syntax clearly
- Encourage students to try problems themselves before revealing solutions
- When explaining algorithms, break them down step by step
- Use trace tables when explaining program execution`;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Check authentication
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ message: 'Messages array is required' });
    }

    // Convert messages to Anthropic format
    const anthropicMessages = messages.map((msg: { role: string; content: string }) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: anthropicMessages,
    });

    // Extract text content from response
    const textContent = response.content.find((block) => block.type === 'text');
    const messageText = textContent?.type === 'text' ? textContent.text : 'Sorry, I could not generate a response.';

    res.status(200).json({ message: messageText });
  } catch (error: any) {
    console.error('AI Tutor error:', error);
    
    // Handle specific API errors
    if (error.status === 429) {
      return res.status(429).json({ message: 'Too many requests. Please try again later.' });
    }
    
    res.status(500).json({ message: 'Failed to get AI response' });
  }
}
