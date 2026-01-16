import mongoose, { Schema, Document, Model } from 'mongoose';

export type NotificationType = 
  | 'assignment_new'        // New assignment assigned to class
  | 'submission_received'   // Teacher uploaded submission for student
  | 'marking_complete'      // Marking finished, feedback available
  | 'submission_returned'   // Submission returned for revision
  | 'assignment_due_soon'   // Assignment due date approaching
  | 'general';              // General announcement

export interface INotification extends Document {
  _id: mongoose.Types.ObjectId;
  student: mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  // Related entities
  assignment?: mongoose.Types.ObjectId;
  submission?: mongoose.Types.ObjectId;
  // Status
  read: boolean;
  readAt?: Date;
  // Metadata
  actionUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    student: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['assignment_new', 'submission_received', 'marking_complete', 'submission_returned', 'assignment_due_soon', 'general'],
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
      maxlength: [1000, 'Message cannot exceed 1000 characters'],
    },
    assignment: {
      type: Schema.Types.ObjectId,
      ref: 'Assignment',
    },
    submission: {
      type: Schema.Types.ObjectId,
      ref: 'Submission',
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
    },
    actionUrl: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
NotificationSchema.index({ student: 1, read: 1, createdAt: -1 });
NotificationSchema.index({ student: 1, createdAt: -1 });
NotificationSchema.index({ assignment: 1, type: 1 });

// Static method to create notifications for a class
NotificationSchema.statics.notifyClass = async function(
  studentIds: mongoose.Types.ObjectId[],
  type: NotificationType,
  title: string,
  message: string,
  assignmentId?: mongoose.Types.ObjectId,
  actionUrl?: string
) {
  const notifications = studentIds.map(studentId => ({
    student: studentId,
    type,
    title,
    message,
    assignment: assignmentId,
    actionUrl,
  }));
  
  return this.insertMany(notifications);
};

const Notification: Model<INotification> =
  mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);

export default Notification;
