import express from "express";
import { Participant, FoodClaim } from "../models/Participant.js";

const router = express.Router();
// POST /api/food/claim - Claim a meal
router.post('/claim', async (req, res) => {
  try {
    const { participantId, mealType } = req.body;

    // Validate input
    if (!participantId || !mealType) {
      return res.status(400).json({
        success: false,
        message: 'Participant ID and meal type are required'
      });
    }

    // Validate meal type
    const validMeals = ['breakfast', 'lunch', 'dinner'];
    if (!validMeals.includes(mealType.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid meal type. Must be breakfast, lunch, or dinner'
      });
    }

    const normalizedParticipantId = participantId.trim().toUpperCase();
    const normalizedMealType = mealType.toLowerCase();

    // Find participant
    const participant = await Participant.findOne({ participantId: normalizedParticipantId });

    if (!participant) {
      return res.status(404).json({
        success: false,
        message: 'Participant ID not found. Please verify your ID.'
      });
    }

    // Check if already claimed
    if (participant.meals[normalizedMealType].claimed) {
      return res.status(400).json({
        success: false,
        message: `${normalizedMealType.charAt(0).toUpperCase() + normalizedMealType.slice(1)} already claimed at ${new Date(participant.meals[normalizedMealType].claimedAt).toLocaleString()}`,
        participant: {
          participantId: participant.participantId,
          memberName: participant.memberName,
          teamName: participant.teamName,
          claimedAt: participant.meals[normalizedMealType].claimedAt
        }
      });
    }

    // Claim the meal
    participant.meals[normalizedMealType].claimed = true;
    participant.meals[normalizedMealType].claimedAt = new Date();
    await participant.save();

    // Add to food claims history
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
      message: `${normalizedMealType.charAt(0).toUpperCase() + normalizedMealType.slice(1)} claimed successfully!`,
      participant: {
        participantId: participant.participantId,
        memberName: participant.memberName,
        teamId: participant.teamId,
        teamName: participant.teamName,
        memberNumber: participant.memberNumber,
        mealType: normalizedMealType,
        claimedAt: participant.meals[normalizedMealType].claimedAt,
        allMeals: participant.meals
      }
    });

  } catch (error) {
    console.error('Meal claim error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during meal claim',
      error: error.message
    });
  }
});

// GET /api/food/participant/:id - Get participant details
router.get('/participant/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const normalizedId = id.trim().toUpperCase();

    const participant = await Participant.findOne({ participantId: normalizedId });

    if (!participant) {
      return res.status(404).json({
        success: false,
        message: 'Participant not found'
      });
    }

    res.status(200).json({
      success: true,
      participant: {
        participantId: participant.participantId,
        memberName: participant.memberName,
        teamId: participant.teamId,
        teamName: participant.teamName,
        memberNumber: participant.memberNumber,
        meals: participant.meals
      }
    });

  } catch (error) {
    console.error('Get participant error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// GET /api/food/stats - Get meal statistics
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
    console.error('Stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message
    });
  }
});

// GET /api/food/recent - Get recent meal claims
router.get('/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    const recentClaims = await FoodClaim.find()
      .sort({ claimedAt: -1 })
      .limit(limit);

    res.status(200).json({
      success: true,
      count: recentClaims.length,
      claims: recentClaims
    });

  } catch (error) {
    console.error('Recent claims error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching recent claims',
      error: error.message
    });
  }
});

export default router;