import mongoose from "mongoose";

// Participant Schema
const participantSchema = new mongoose.Schema({
  participantId: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  teamId: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  teamName: {
    type: String,
    required: true,
    trim: true
  },
  memberName: {
    type: String,
    required: true,
    trim: true
  },
  memberNumber: {
    type: Number,
    required: true,
    min: 1,
    max: 4
  },
  
  meals: {
    breakfast: {
      claimed: {
        type: Boolean,
        default: false
      },
      claimedAt: {
        type: Date,
        default: null
      }
    },
    lunch: {
      claimed: {
        type: Boolean,
        default: false
      },
      claimedAt: {
        type: Date,
        default: null
      }
    },
    dinner: {
      claimed: {
        type: Boolean,
        default: false
      },
      claimedAt: {
        type: Date,
        default: null
      }
    }
  }
}, {
  timestamps: true
});

// Food Claim History Schema
const foodClaimSchema = new mongoose.Schema({
  participantId: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  teamId: {
    type: String,
    required: true,
    uppercase: true
  },
  teamName: {
    type: String,
    required: true
  },
  memberName: {
    type: String,
    required: true
  },
  mealType: {
    type: String,
    enum: ['breakfast', 'lunch', 'dinner'],
    required: true,
    lowercase: true
  },
  claimedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
participantSchema.index({ participantId: 1 });
participantSchema.index({ teamId: 1 });
foodClaimSchema.index({ participantId: 1, mealType: 1 });

// Models
const Participant = mongoose.model('Participant', participantSchema);
const FoodClaim = mongoose.model('FoodClaim', foodClaimSchema);

// ✅ Export both models (ESM syntax)
export { Participant,
  FoodClaim };



