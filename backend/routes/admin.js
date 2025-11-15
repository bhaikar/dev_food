import express from "express";
import { SelectedTeam, RegistrationDone } from "../models/Team.js";
import XLSX from "xlsx";

const router = express.Router();

// ------------------------------
// GET /api/admin/stats - Get statistics
// ------------------------------
router.get("/stats", async (req, res) => {
  try {
    const total = await SelectedTeam.countDocuments();
    const checkedIn = await SelectedTeam.countDocuments({ isCheckedIn: true });
    const pending = total - checkedIn;

    res.json({
      success: true,
      stats: {
        total,
        checkedIn,
        pending,
      },
    });
  } catch (error) {
    console.error("Stats error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching statistics",
      error: error.message,
    });
  }
});

// ------------------------------
// GET /api/admin/all-teams - Get all teams
// ------------------------------
router.get("/all-teams", async (req, res) => {
  try {
    const teams = await SelectedTeam.find({}).sort({ teamId: 1 });

    res.json({
      success: true,
      teams: teams.map((team) => ({
        teamId: team.teamId,
        teamName: team.teamName,
        college: team.college,
        email: team.email,
        members: team.members || [],
        isCheckedIn: team.isCheckedIn,
        checkInTime: team.checkInTime || null,
      })),
    });
  } catch (error) {
    console.error("All teams error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching teams",
      error: error.message,
    });
  }
});

// ------------------------------
// POST /api/admin/manual-checkin - Manual check-in
// ------------------------------
router.post("/manual-checkin", async (req, res) => {
  try {
    const { teamId } = req.body;

    if (!teamId) {
      return res.status(400).json({
        success: false,
        message: "Team ID is required",
      });
    }

    const normalizedTeamId = teamId.trim().toUpperCase();
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
          message: "Team ID not found",
        });
      }
      if (existing.isCheckedIn) {
        return res.status(400).json({
          success: false,
          message: "Team already checked in",
        });
      }
      return res.status(400).json({
        success: false,
        message: "Unable to check in team",
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

    res.json({
      success: true,
      message: "Team checked in successfully",
      team: {
        teamId: updatedTeam.teamId,
        teamName: updatedTeam.teamName,
        checkInTime: updatedTeam.checkInTime,
      },
    });
  } catch (error) {
    console.error("Manual check-in error:", error);
    res.status(500).json({
      success: false,
      message: "Error during manual check-in",
      error: error.message,
    });
  }
});

// ------------------------------
// DELETE /api/admin/undo-checkin/:teamId - Undo check-in
// ------------------------------
router.delete("/undo-checkin/:teamId", async (req, res) => {
  try {
    const { teamId } = req.params;
    const normalizedTeamId = teamId.trim().toUpperCase();

    const updatedTeam = await SelectedTeam.findOneAndUpdate(
      { teamId: normalizedTeamId, isCheckedIn: true },
      { $set: { isCheckedIn: false, checkInTime: null } },
      { new: true }
    );

    if (!updatedTeam) {
      return res.status(404).json({
        success: false,
        message: "Team not found or not checked in",
      });
    }

    // Update RegistrationDone collection
    await RegistrationDone.findOneAndUpdate(
      { teamId: normalizedTeamId },
      { $set: { status: "absent" } },
      { upsert: true }
    );

    res.json({
      success: true,
      message: "Check-in undone successfully",
      team: {
        teamId: updatedTeam.teamId,
        teamName: updatedTeam.teamName,
      },
    });
  } catch (error) {
    console.error("Undo check-in error:", error);
    res.status(500).json({
      success: false,
      message: "Error undoing check-in",
      error: error.message,
    });
  }
});

// ------------------------------
// GET /api/admin/export - Export checked-in teams to Excel
// ------------------------------
router.get("/export", async (req, res) => {
  try {
    const teams = await SelectedTeam.find({ isCheckedIn: true }).sort({
      checkInTime: -1,
    });

    const data = teams.map((team, index) => ({
      "S.No": index + 1,
      "Team ID": team.teamId,
      "Team Name": team.teamName,
      College: team.college || "Malnad College of Engineering",
      Email: team.email || "",
      "Check-in Time": team.checkInTime
        ? new Date(team.checkInTime).toLocaleString("en-IN")
        : "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Checked-In Teams");

    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    const filename = `HACK_MCE_5.0_CheckedIn_${new Date()
      .toISOString()
      .split("T")[0]}.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error) {
    console.error("Export error:", error);
    res.status(500).json({
      success: false,
      message: "Error exporting data",
      error: error.message,
    });
  }
});

// ------------------------------
// ✅ Export router (ESM syntax)
// ------------------------------
export default router;
