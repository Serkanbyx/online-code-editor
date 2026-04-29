import mongoose from 'mongoose';

const { Schema } = mongoose;

const reportSchema = new Schema(
  {
    targetType: {
      type: String,
      required: true,
      enum: ['snippet', 'comment'],
    },
    targetId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    reporter: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    reason: {
      type: String,
      required: true,
      enum: ['spam', 'abuse', 'copyright', 'inappropriate', 'other'],
    },
    details: {
      type: String,
      default: '',
      maxlength: 500,
    },
    status: {
      type: String,
      required: true,
      enum: ['open', 'resolved', 'dismissed'],
      default: 'open',
    },
    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    action: {
      type: String,
      enum: ['noop', 'hideTarget', 'removeTarget', 'banUser'],
      default: 'noop',
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

reportSchema.pre('save', async function () {
  if (this.isModified('details')) {
    this.details = (this.details || '').trim().slice(0, 500);
  }
});

reportSchema.index({ targetType: 1, targetId: 1, reporter: 1 }, { unique: true });
reportSchema.index({ status: 1, createdAt: -1 });

reportSchema.set('toJSON', {
  versionKey: false,
  transform: stripInternalFields,
});

reportSchema.set('toObject', {
  versionKey: false,
  transform: stripInternalFields,
});

const Report = mongoose.models.Report || mongoose.model('Report', reportSchema);

export default Report;
