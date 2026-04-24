import mongoose from 'mongoose';

import { SUPPORTED_LANGUAGES } from '../utils/constants.js';

const { Schema } = mongoose;

const uuidV4Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const tagPattern = /^[a-z0-9-]+$/;

function normalizeTags(tags) {
  if (!Array.isArray(tags)) {
    return [];
  }

  return [...new Set(tags.map((tag) => tag.toLowerCase().trim()).filter(Boolean))].slice(0, 6);
}

const snippetSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 120,
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: 500,
    },
    language: {
      type: String,
      required: true,
      enum: SUPPORTED_LANGUAGES,
      default: 'javascript',
    },
    code: {
      type: String,
      required: true,
      default: '',
      maxlength: 100000,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    isPublic: {
      type: Boolean,
      required: true,
      default: false,
    },
    roomId: {
      type: String,
      default: null,
      index: true,
      validate: {
        validator(value) {
          return value === null || uuidV4Pattern.test(value);
        },
        message: 'roomId must be a valid UUID v4 string.',
      },
    },
    forkedFrom: {
      type: Schema.Types.ObjectId,
      ref: 'Snippet',
      default: null,
    },
    tags: {
      type: [String],
      default: [],
      validate: [
        {
          validator(tags) {
            return tags.length <= 6;
          },
          message: 'A snippet can have at most 6 tags.',
        },
        {
          validator(tags) {
            return tags.every((tag) => tag.length >= 1 && tag.length <= 24 && tagPattern.test(tag));
          },
          message: 'Each tag must be 1-24 lowercase letters, numbers, or hyphens.',
        },
      ],
    },
    views: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    likesCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    commentsCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
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

snippetSchema.pre('save', async function () {
  if (this.isModified('tags')) {
    this.tags = normalizeTags(this.tags);
  }
});

snippetSchema.virtual('codePreview').get(function () {
  return (this.code || '').split('\n').slice(0, 4).join('\n');
});

snippetSchema.index({ author: 1, createdAt: -1 });
snippetSchema.index({ isPublic: 1, status: 1, createdAt: -1 });
snippetSchema.index({ title: 'text', description: 'text', tags: 'text' });

snippetSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: stripInternalFields,
});

snippetSchema.set('toObject', {
  virtuals: true,
  versionKey: false,
  transform: stripInternalFields,
});

const Snippet = mongoose.models.Snippet || mongoose.model('Snippet', snippetSchema);

export default Snippet;
