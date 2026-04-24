import mongoose from 'mongoose';

const { Schema } = mongoose;

const commentSchema = new Schema(
  {
    snippet: {
      type: Schema.Types.ObjectId,
      ref: 'Snippet',
      required: true,
      index: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
      minlength: 1,
      maxlength: 1000,
    },
    parentComment: {
      type: Schema.Types.ObjectId,
      ref: 'Comment',
      default: null,
    },
    status: {
      type: String,
      required: true,
      enum: ['active', 'hidden', 'removed'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

function stripInternalFields(_doc, ret) {
  delete ret.__v;
  return ret;
}

commentSchema.pre('save', async function () {
  if (this.isModified('content')) {
    this.content = this.content.trim();
  }
});

commentSchema.index({ snippet: 1, parentComment: 1, createdAt: 1 });

commentSchema.set('toJSON', {
  versionKey: false,
  transform: stripInternalFields,
});

commentSchema.set('toObject', {
  versionKey: false,
  transform: stripInternalFields,
});

const Comment = mongoose.models.Comment || mongoose.model('Comment', commentSchema);

export default Comment;
