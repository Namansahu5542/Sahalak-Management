import mongoose from "mongoose";

const pendingSignupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    email: { type: String, required: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["user", "owner"], default: "user" },
    otpDigest: { type: String, required: true },
    attempts: { type: Number, default: 0, min: 0, max: 5 },
    updatedAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
  },
  { collection: "pendingSignups", timestamps: { createdAt: true, updatedAt: false }, versionKey: false },
);

pendingSignupSchema.index({ email: 1 }, { unique: true });
pendingSignupSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const PendingSignup = mongoose.models.PendingSignup || mongoose.model("PendingSignup", pendingSignupSchema);

export default PendingSignup;
