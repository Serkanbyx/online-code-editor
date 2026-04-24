import mongoose from 'mongoose';

const { Schema } = mongoose;

const likeSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    snippet: {
      type: Schema.Types.ObjectId,
      ref: 'Snippet',
      required: true,
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

function stripInternalFields(_doc, ret) {
  delete ret.__v;
  return ret;
}

likeSchema.index({ user: 1, snippet: 1 }, { unique: true });
likeSchema.index({ user: 1, createdAt: -1 });

likeSchema.set('toJSON', {
  versionKey: false,
  transform: stripInternalFields,
});

likeSchema.set('toObject', {
  versionKey: false,
  transform: stripInternalFields,
});

const Like = mongoose.models.Like || mongoose.model('Like', likeSchema);

export default Like;
