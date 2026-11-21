import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, required: true, trim: true, lowercase: true },
    passwordHash: String,
    role: { type: String, enum: ["user", "owner"], default: "user" },
    emailVerifiedAt: Date,
    ownerActivatedAt: Date,
  },
  { collection: "users", strict: false, versionKey: false },
);

userSchema.index({ email: 1 }, { unique: true });

const User = mongoose.models.User || mongoose.model("User", userSchema);

export default User;
