import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

// MongoDB URI - Only ONE database (hackmce5_food)
const MONGODB_URI = process.env.MONGODB_URI;

// Team Schema (existing in selectedteams collection)
const teamSchema = new mongoose.Schema({
  teamId: String,
  teamName: String,
  members: [String],
  
  isCheckedIn: Boolean,
  checkInTime: Date
});

// Participant Schema (new participants collection)
const participantSchema = new mongoose.Schema({
  participantId: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
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
  memberNumber: {
    type: Number,
    required: true
  },
  meals: {
    breakfast: {
      claimed: { type: Boolean, default: false },
      claimedAt: { type: Date, default: null }
    },
    lunch: {
      claimed: { type: Boolean, default: false },
      claimedAt: { type: Date, default: null }
    },
    dinner: {
      claimed: { type: Boolean, default: false },
      claimedAt: { type: Date, default: null }
    }
  }
}, {
  timestamps: true
});

async function generateParticipants() {
  try {
    console.log('🔄 Connecting to database...\n');

    // Connect to database
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB (hackmce5_food)\n');

    // Create models
    const SelectedTeam = mongoose.model('SelectedTeam', teamSchema);
    const Participant = mongoose.model('Participant', participantSchema);

    // Get all teams
    const teams = await SelectedTeam.find();
    console.log(`📊 Found ${teams.length} teams\n`);

    if (teams.length === 0) {
      console.log('⚠️ No teams found. Import teams first.\n');
      process.exit(0);
    }

    // Clear existing participants
    const deletedCount = await Participant.deleteMany({});
    console.log(`🗑️ Cleared ${deletedCount.deletedCount} existing participants\n`);

    console.log('🔄 Generating participants...\n');

    let totalParticipants = 0;
    let successCount = 0;
    let errorCount = 0;

    for (const team of teams) {
      if (!team.members || team.members.length === 0) {
        console.log(`⚠️ Team ${team.teamId} has no members, skipping...`);
        continue;
      }

      console.log(`📋 Team ${team.teamId} - ${team.teamName} (${team.members.length} members)`);

      for (let i = 0; i < team.members.length; i++) {
        const memberName = team.members[i];
        const memberNumber = i + 1;
        const participantId = `${team.teamId}-M${memberNumber}`;

        try {
          const participant = new Participant({
            participantId,
            teamId: team.teamId,
            teamName: team.teamName,
            memberName,
            memberNumber,
            meals: {
              breakfast: { claimed: false, claimedAt: null },
              lunch: { claimed: false, claimedAt: null },
              dinner: { claimed: false, claimedAt: null }
            }
          });

          await participant.save();
          console.log(`  ✅ ${participantId} - ${memberName}`);
          successCount++;
          totalParticipants++;

        } catch (error) {
          console.log(`  ❌ ${participantId} - Error: ${error.message}`);
          errorCount++;
        }
      }
      console.log('');
    }

    console.log('='.repeat(70));
    console.log('📊 GENERATION SUMMARY');
    console.log('='.repeat(70));
    console.log(`✅ Successfully generated: ${successCount}`);
    console.log(`❌ Failed: ${errorCount}`);
    console.log(`📈 Total teams: ${teams.length}`);
    console.log(`📈 Total participants: ${totalParticipants}`);
    console.log('='.repeat(70));

    // Show sample participants
    console.log('\n📋 Sample participants:');
    const sampleParticipants = await Participant.find().limit(5);
    sampleParticipants.forEach(p =>
      console.log(`   ${p.participantId} - ${p.memberName} (${p.teamName})`)
    );

    console.log('\n✅ Participant generation completed successfully!\n');

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

generateParticipants();
