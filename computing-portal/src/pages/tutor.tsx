import { useState, useRef, useEffect } from 'react';
import Head from 'next/head';
import { FiSend, FiTrash2, FiBook, FiCode, FiGrid, FiCpu } from 'react-icons/fi';
import toast from 'react-hot-toast';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const topicSuggestions = [
  { icon: FiCpu, topic: 'Computer Architecture', query: 'Explain the function of CPU, RAM, and secondary storage' },
  { icon: FiCode, topic: 'Python Basics', query: 'How do I use for loops and while loops in Python?' },
  { icon: FiGrid, topic: 'VLOOKUP', query: 'How does VLOOKUP work with exact and approximate matching?' },
  { icon: FiBook, topic: 'Binary Numbers', query: "Explain how to convert decimal to binary and use two's complement" },
];

export default function AITutor() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Hi! I'm your AI tutor for O-Level Computing (7155). I can help you with:

• **Module 1**: Computer Architecture, Data Representation, Logic Gates
• **Module 2**: Python Programming, Algorithms, Testing & Debugging
• **Module 3**: Spreadsheet Functions (VLOOKUP, IF, SUMIF, etc.)
• **Module 4**: Networking, Security, Privacy
• **Module 5**: Impact of Computing, AI, Ethics

What would you like to learn about today?`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/tutor/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      toast.error('Failed to get response. Please try again.');
      // Remove the user message if there was an error
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        role: 'assistant',
        content: `Chat cleared! What would you like to learn about?`,
        timestamp: new Date(),
      },
    ]);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      <Head>
        <title>AI Tutor | Computing 7155 Portal</title>
      </Head>

      <div className="max-w-4xl mx-auto h-[calc(100vh-120px)] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🤖 AI Tutor</h1>
            <p className="text-gray-600 mt-1">
              Get help with any 7155 Computing topic
            </p>
          </div>
          <button
            onClick={clearChat}
            className="flex items-center px-4 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <FiTrash2 className="mr-2" />
            Clear Chat
          </button>
        </div>

        {/* Topic Suggestions */}
        {messages.length <= 1 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {topicSuggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => sendMessage(suggestion.query)}
                className="flex flex-col items-center p-4 bg-white border border-gray-200 rounded-xl hover:border-primary-300 hover:shadow-md transition-all"
              >
                <suggestion.icon className="text-primary-600 mb-2" size={24} />
                <span className="text-sm font-medium text-gray-700 text-center">
                  {suggestion.topic}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto bg-white rounded-xl border border-gray-200 p-4 mb-4">
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`chat-message ${message.role}`}
              >
                <div className="flex items-start space-x-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      message.role === 'assistant'
                        ? 'bg-primary-100 text-primary-600'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {message.role === 'assistant' ? '🤖' : '👤'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-500 mb-1">
                      {message.role === 'assistant' ? 'AI Tutor' : 'You'} •{' '}
                      {message.timestamp.toLocaleTimeString()}
                    </div>
                    <div className="prose prose-sm max-w-none">
                      {message.content.split('\n').map((line, i) => (
                        <p key={i} className="mb-2 last:mb-0">
                          {line.startsWith('•') ? (
                            <span className="block pl-4">{line}</span>
                          ) : line.startsWith('**') ? (
                            <strong>
                              {line.replace(/\*\*/g, '')}
                            </strong>
                          ) : (
                            line
                          )}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="chat-message assistant">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                    🤖
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="spinner w-4 h-4"></div>
                    <span className="text-gray-500">Thinking...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-end space-x-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything about Computing 7155..."
              className="flex-1 resize-none border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-h-[48px] max-h-32"
              rows={1}
              disabled={isLoading}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || isLoading}
              className="flex items-center justify-center w-12 h-12 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiSend size={20} />
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>
    </>
  );
}
