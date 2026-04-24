import mongoose from 'mongoose';

import { SUPPORTED_LANGUAGES } from '../utils/constants.js';

const { Schema } = mongoose;

const uuidV4Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeParticipants(participants) {
  if (!Array.isArray(participants)) {
    return [];
  }

  return [...new Map(participants.map((participant) => [participant.toString(), participant])).values()];
}

const roomSchema = new Schema(
  {
    roomId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      validate: {
        validator(value) {
          return uuidV4Pattern.test(value);
        },
        message: 'roomId must be a valid UUID v4 string.',
      },
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 80,
    },
    language: {
      type: String,
      required: true,
      enum: SUPPORTED_LANGUAGES,
      default: 'javascript',
    },
    owner: {
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
    participants: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: 'User',
        },
      ],
      required: true,
      default: [],
    },
    lastActiveAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
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

roomSchema.pre('save', async function () {
  if (this.isModified('participants')) {
    this.participants = normalizeParticipants(this.participants);
  }
});

roomSchema.index({ owner: 1, lastActiveAt: -1 });
roomSchema.index({ participants: 1, lastActiveAt: -1 });

roomSchema.set('toJSON', {
  versionKey: false,
  transform: stripInternalFields,
});

roomSchema.set('toObject', {
  versionKey: false,
  transform: stripInternalFields,
});

const Room = mongoose.models.Room || mongoose.model('Room', roomSchema);

export default Room;
