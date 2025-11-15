import express from "express";
import { SelectedTeam, RegistrationDone } from "../models/Team.js";

const router = express.Router();

// ------------------------------
// POST /api/checkin - Check-in a team
// ------------------------------
router.post("/", async (req, res) => {
  try {
    const { teamId } = req.body;

    // Validate input
    if (!teamId) {
      return res.status(400).json({
        success: false,
        message: "Team ID is required",
      });
    }

    const normalizedTeamId = teamId.trim().toUpperCase();

    // Find and atomically update team (prevent race condition)
    const now = new Date();
    const updatedTeam = await SelectedTeam.findOneAndUpdate(
      { teamId: normalizedTeamId, isCheckedIn: false },
      { $set: { isCheckedIn: true, checkInTime: now } },
      { new: true }
    );

    if (!updatedTeam) {
      const existing = await SelectedTeam.findOne({ teamId: normalizedTeamId });
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: "Team ID not found. Please verify your Team ID.",
        });
      }
      if (existing.isCheckedIn) {
        return res.status(400).json({
          success: false,
          message: "This team has already checked in.",
          team: {
            teamId: existing.teamId,
            teamName: existing.teamName,
            checkInTime: existing.checkInTime,
          },
        });
      }
      return res.status(400).json({
        success: false,
        message: "Unable to check in. Please try again.",
      });
    }

    // Upsert into RegistrationDone collection
    await RegistrationDone.findOneAndUpdate(
      { teamId: updatedTeam.teamId },
      {
        $set: {
          teamName: updatedTeam.teamName,
          checkInTime: updatedTeam.checkInTime,
          status: "present",
        },
      },
      { upsert: true, new: true }
    );

    // Success response
    res.status(200).json({
      success: true,
      message: "Team checked in successfully!",
      team: {
        teamId: updatedTeam.teamId,
        teamName: updatedTeam.teamName,
        college: updatedTeam.college,
        members: updatedTeam.members || [],
        checkInTime: updatedTeam.checkInTime,
      },
    });
  } catch (error) {
    console.error("Check-in error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during check-in. Please try again.",
      error: error.message,
    });
  }
});

// ------------------------------
// GET /api/checkin/status/:teamId - Check if team is already checked in
// ------------------------------
router.get("/status/:teamId", async (req, res) => {
  try {
    const { teamId } = req.params;
    const normalizedTeamId = teamId.trim().toUpperCase();

    const team = await SelectedTeam.findOne({ teamId: normalizedTeamId });

    if (!team) {
      return res.status(404).json({
        success: false,
        message: "Team not found",
      });
    }

    res.status(200).json({
      success: true,
      isCheckedIn: team.isCheckedIn,
      checkInTime: team.checkInTime,
      teamName: team.teamName,
    });
  } catch (error) {
    console.error("Status check error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

// ------------------------------
// ✅ Export router (ESM syntax)
// ------------------------------
export default router;


