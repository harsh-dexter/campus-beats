import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPersistentMessage extends Document {
  conversationId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  text: string;
  createdAt: Date;
}

const PersistentMessageSchema: Schema<IPersistentMessage> = new Schema({
  conversationId: { type: Schema.Types.ObjectId, ref: "Conversation", required: true },
  senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export const PersistentMessage: Model<IPersistentMessage> =
  mongoose.models.PersistentMessage ||
  mongoose.model<IPersistentMessage>("PersistentMessage", PersistentMessageSchema);