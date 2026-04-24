import bcrypt from 'bcrypt';
import mongoose from 'mongoose';

const { Schema } = mongoose;

const usernameRegex = /^[a-z0-9_]+$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const allowedUrlProtocols = new Set(['http:', 'https:']);

function isValidOptionalUrl(value) {
  if (!value) return true;

  try {
    const parsedUrl = new URL(value);
    return allowedUrlProtocols.has(parsedUrl.protocol);
  } catch {
    return false;
  }
}

const privacySchema = new Schema(
  {
    showEmail: {
      type: Boolean,
      default: false,
    },
    showLikedSnippets: {
      type: Boolean,
      default: true,
    },
    showComments: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false }
);

const notificationsSchema = new Schema(
  {
    commentOnSnippet: {
      type: Boolean,
      default: true,
    },
    snippetForked: {
      type: Boolean,
      default: true,
    },
    productUpdates: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const preferencesSchema = new Schema(
  {
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'system',
    },
    editorTheme: {
      type: String,
      enum: ['vs', 'vs-dark', 'hc-black', 'hc-light'],
      default: 'vs-dark',
    },
    fontSize: {
      type: Number,
      min: 10,
      max: 24,
      default: 14,
    },
    tabSize: {
      type: Number,
      enum: [2, 4, 8],
      default: 2,
    },
    keymap: {
      type: String,
      enum: ['default', 'vim', 'emacs'],
      default: 'default',
    },
    fontFamily: {
      type: String,
      enum: ['Fira Code', 'JetBrains Mono', 'Source Code Pro', 'Menlo', 'Consolas'],
      default: 'Fira Code',
    },
    language: {
      type: String,
      enum: ['en'],
      default: 'en',
    },
    wordWrap: {
      type: String,
      enum: ['on', 'off'],
      default: 'on',
    },
    minimap: {
      type: Boolean,
      default: true,
    },
    lineNumbers: {
      type: String,
      enum: ['on', 'off', 'relative'],
      default: 'on',
    },
    privacy: {
      type: privacySchema,
      default: () => ({}),
    },
    notifications: {
      type: notificationsSchema,
      default: () => ({}),
    },
  },
  { _id: false }
);

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 24,
      match: usernameRegex,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 48,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
      trim: true,
      match: emailRegex,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false,
    },
    role: {
      type: String,
      required: true,
      enum: ['user', 'admin'],
      default: 'user',
    },
    avatarUrl: {
      type: String,
      default: '',
      trim: true,
      validate: {
        validator: isValidOptionalUrl,
        message: 'avatarUrl must be a valid HTTP or HTTPS URL.',
      },
    },
    bio: {
      type: String,
      default: '',
      trim: true,
      maxlength: 240,
    },
    isBanned: {
      type: Boolean,
      required: true,
      default: false,
    },
    bannedReason: {
      type: String,
      default: '',
      trim: true,
      maxlength: 240,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
    preferences: {
      type: preferencesSchema,
      required: true,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
  }
);

function stripSensitiveFields(_doc, ret) {
  delete ret.password;
  delete ret.__v;
  return ret;
}

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function (plainPassword) {
  return bcrypt.compare(plainPassword, this.password);
};

userSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: stripSensitiveFields,
});

userSchema.set('toObject', {
  virtuals: true,
  versionKey: false,
  transform: stripSensitiveFields,
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User;
