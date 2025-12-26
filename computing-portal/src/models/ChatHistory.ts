import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface IChatHistory extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  sessionId: string;
  module?: 1 | 2 | 3 | 4 | 5;
  topic?: string;
  messages: IChatMessage[];
  context?: {
    currentExercise?: string;
    codeSnippet?: string;
    spreadsheetContext?: string;
  };
  helpful: boolean | null;
  createdAt: Date;
  updatedAt: Date;
}

const ChatMessageSchema = new Schema<IChatMessage>(
  {
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const ChatHistorySchema = new Schema<IChatHistory>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    module: {
      type: Number,
      enum: [1, 2, 3, 4, 5],
    },
    topic: {
      type: String,
      trim: true,
    },
    messages: [ChatMessageSchema],
    context: {
      currentExercise: String,
      codeSnippet: String,
      spreadsheetContext: String,
    },
    helpful: {
      type: Boolean,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Index for retrieving user chat history
ChatHistorySchema.index({ userId: 1, createdAt: -1 });

const ChatHistory: Model<IChatHistory> =
  mongoose.models.ChatHistory ||
  mongoose.model<IChatHistory>('ChatHistory', ChatHistorySchema);

export default ChatHistory;
