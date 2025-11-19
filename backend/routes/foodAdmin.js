import express from "express";
import { Participant, FoodClaim } from "../models/Participant.js";
import XLSX from "xlsx";

const router = express.Router();
// GET /api/food/admin/stats - Get detailed statistics
router.get('/stats', async (req, res) => {
  try {
    const totalParticipants = await Participant.countDocuments();
    
    const breakfastClaimed = await Participant.countDocuments({ 'meals.breakfast.claimed': true });
    const lunchClaimed = await Participant.countDocuments({ 'meals.lunch.claimed': true });
    const dinnerClaimed = await Participant.countDocuments({ 'meals.dinner.claimed': true });

    res.status(200).json({
      success: true,
      stats: {
        total: totalParticipants,
        breakfast: {
          claimed: breakfastClaimed,
          pending: totalParticipants - breakfastClaimed,
          percentage: totalParticipants > 0 ? Math.round((breakfastClaimed / totalParticipants) * 100) : 0
        },
        lunch: {
          claimed: lunchClaimed,
          pending: totalParticipants - lunchClaimed,
          percentage: totalParticipants > 0 ? Math.round((lunchClaimed / totalParticipants) * 100) : 0
        },
        dinner: {
          claimed: dinnerClaimed,
          pending: totalParticipants - dinnerClaimed,
          percentage: totalParticipants > 0 ? Math.round((dinnerClaimed / totalParticipants) * 100) : 0
        }
      }
    });

  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message
    });
  }
});

// GET /api/food/admin/all-participants - Get all participants grouped by team
router.get('/all-participants', async (req, res) => {
  try {
    const participants = await Participant.find()
      .sort({ teamId: 1, memberNumber: 1 });

    // Group by team
    const teamGroups = {};
    participants.forEach(participant => {
      if (!teamGroups[participant.teamId]) {
        teamGroups[participant.teamId] = {
          teamId: participant.teamId,
          teamName: participant.teamName,
          members: []
        };
      }
      
      teamGroups[participant.teamId].members.push({
        participantId: participant.participantId,
        memberName: participant.memberName,
        memberNumber: participant.memberNumber,
        meals: participant.meals
      });
    });

    // Convert to array
    const teams = Object.values(teamGroups);

    res.status(200).json({
      success: true,
      totalTeams: teams.length,
      totalParticipants: participants.length,
      teams: teams
    });

  } catch (error) {
    console.error('Get all participants error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching participants',
      error: error.message
    });
  }
});

// GET /api/food/admin/team/:teamId - Get specific team's meal status
router.get('/team/:teamId', async (req, res) => {
  try {
    const { teamId } = req.params;
    const normalizedTeamId = teamId.trim().toUpperCase();

    const participants = await Participant.find({ teamId: normalizedTeamId })
      .sort({ memberNumber: 1 });

    if (participants.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    res.status(200).json({
      success: true,
      team: {
        teamId: normalizedTeamId,
        teamName: participants[0].teamName,
        memberCount: participants.length,
        members: participants.map(p => ({
          participantId: p.participantId,
          memberName: p.memberName,
          memberNumber: p.memberNumber,
          meals: p.meals
        }))
      }
    });

  } catch (error) {
    console.error('Get team error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching team',
      error: error.message
    });
  }
});

// POST /api/food/admin/manual-claim - Manually claim meal
router.post('/manual-claim', async (req, res) => {
  try {
    const { participantId, mealType } = req.body;

    if (!participantId || !mealType) {
      return res.status(400).json({
        success: false,
        message: 'Participant ID and meal type are required'
      });
    }

    const validMeals = ['breakfast', 'lunch', 'dinner'];
    if (!validMeals.includes(mealType.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid meal type'
      });
    }

    const normalizedParticipantId = participantId.trim().toUpperCase();
    const normalizedMealType = mealType.toLowerCase();

    const participant = await Participant.findOne({ participantId: normalizedParticipantId });

    if (!participant) {
      return res.status(404).json({
        success: false,
        message: 'Participant not found'
      });
    }

    if (participant.meals[normalizedMealType].claimed) {
      return res.status(400).json({
        success: false,
        message: 'Meal already claimed'
      });
    }

    // Claim the meal
    participant.meals[normalizedMealType].claimed = true;
    participant.meals[normalizedMealType].claimedAt = new Date();
    await participant.save();

    // Add to history
    const foodClaim = new FoodClaim({
      participantId: participant.participantId,
      teamId: participant.teamId,
      teamName: participant.teamName,
      memberName: participant.memberName,
      mealType: normalizedMealType,
      claimedAt: participant.meals[normalizedMealType].claimedAt
    });
    await foodClaim.save();

    res.status(200).json({
      success: true,
      message: 'Meal claimed successfully',
      participant: {
        participantId: participant.participantId,
        memberName: participant.memberName,
        mealType: normalizedMealType,
        claimedAt: participant.meals[normalizedMealType].claimedAt
      }
    });

  } catch (error) {
    console.error('Manual claim error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during manual claim',
      error: error.message
    });
  }
});

// DELETE /api/food/admin/unclaim - Undo meal claim
router.delete('/unclaim', async (req, res) => {
  try {
    const { participantId, mealType } = req.body;

    if (!participantId || !mealType) {
      return res.status(400).json({
        success: false,
        message: 'Participant ID and meal type are required'
      });
    }

    const normalizedParticipantId = participantId.trim().toUpperCase();
    const normalizedMealType = mealType.toLowerCase();

    const participant = await Participant.findOne({ participantId: normalizedParticipantId });

    if (!participant) {
      return res.status(404).json({
        success: false,
        message: 'Participant not found'
      });
    }

    if (!participant.meals[normalizedMealType].claimed) {
      return res.status(400).json({
        success: false,
        message: 'Meal not claimed yet'
      });
    }

    // Undo claim
    participant.meals[normalizedMealType].claimed = false;
    participant.meals[normalizedMealType].claimedAt = null;
    await participant.save();

    // Remove from history
    await FoodClaim.deleteOne({
      participantId: normalizedParticipantId,
      mealType: normalizedMealType
    });

    res.status(200).json({
      success: true,
      message: 'Meal claim undone successfully'
    });

  } catch (error) {
    console.error('Unclaim error:', error);
    res.status(500).json({
      success: false,
      message: 'Error undoing claim',
      error: error.message
    });
  }
});

// GET /api/food/admin/export - Export to Excel
router.get('/export', async (req, res) => {
  try {
    const participants = await Participant.find().sort({ teamId: 1, memberNumber: 1 });

    if (participants.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No participants found'
      });
    }

    // Prepare data for Excel
    const excelData = participants.map((participant, index) => ({
      'S.No': index + 1,
      'Participant ID': participant.participantId,
      'Team ID': participant.teamId,
      'Team Name': participant.teamName,
      'Member Name': participant.memberName,
      'Member Number': participant.memberNumber,
      'Breakfast': participant.meals.breakfast.claimed ? '✓' : '-',
      'Breakfast Time': participant.meals.breakfast.claimed 
        ? new Date(participant.meals.breakfast.claimedAt).toLocaleString('en-IN')
        : '-',
      'Lunch': participant.meals.lunch.claimed ? '✓' : '-',
      'Lunch Time': participant.meals.lunch.claimed 
        ? new Date(participant.meals.lunch.claimedAt).toLocaleString('en-IN')
        : '-',
      'Dinner': participant.meals.dinner.claimed ? '✓' : '-',
      'Dinner Time': participant.meals.dinner.claimed 
        ? new Date(participant.meals.dinner.claimedAt).toLocaleString('en-IN')
        : '-'
    }));

    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    ws['!cols'] = [
      { wch: 6 },   // S.No
      { wch: 15 },  // Participant ID
      { wch: 12 },  // Team ID
      { wch: 20 },  // Team Name
      { wch: 20 },  // Member Name
      { wch: 8 },   // Member Number
      { wch: 10 },  // Breakfast
      { wch: 20 },  // Breakfast Time
      { wch: 10 },  // Lunch
      { wch: 20 },  // Lunch Time
      { wch: 10 },  // Dinner
      { wch: 20 }   // Dinner Time
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Food Claims');

    // Generate buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Set headers
    const filename = `HACK_MCE_5.0_Food_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    res.send(buffer);

  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting data',
      error: error.message
    });
  }
});

export default router;