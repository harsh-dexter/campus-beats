import mongoose, { Schema, Document, Model } from "mongoose";

export interface IReport extends Document {
  reportedUserId: mongoose.Types.ObjectId;
  reporterId: mongoose.Types.ObjectId;
  reason: string;
  createdAt: Date;
}

const ReportSchema: Schema<IReport> = new Schema({
  reportedUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  reporterId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  reason: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export const Report: Model<IReport> =
  mongoose.models.Report || mongoose.model<IReport>("Report", ReportSchema);