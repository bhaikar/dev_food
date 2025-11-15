import mongoose from "mongoose";

const selectedTeamSchema = new mongoose.Schema({
  teamId: { type: String, required: true, unique: true },
  teamName: { type: String, required: true },
  college: { type: String, default: "Malnad College of Engineering" },
  members: { type: [String], default: [] },
  contactNumber: { type: String },
  email: { type: String },
  isCheckedIn: { type: Boolean, default: false },
  checkInTime: { type: Date, default: null },
});

const registrationDoneSchema = new mongoose.Schema({
  teamId: { type: String, required: true, unique: true },
  teamName: { type: String, required: true },
  checkInTime: { type: Date, default: null },
  status: { type: String, enum: ["present", "absent"], default: "present" },
});

// Create Mongoose models
const SelectedTeam = mongoose.model("SelectedTeam", selectedTeamSchema);
const RegistrationDone = mongoose.model("RegistrationDone", registrationDoneSchema);

// ✅ Export both models (ESM syntax)
export { SelectedTeam, RegistrationDone };
