const mongoose = require('mongoose');
const { SelectedTeam, RegistrationDone } = require('../models/Team');

const MONGODB_URI = 'mongodb://localhost:27017/hackmce5';

async function fixCheckedInStatus() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get all teams from RegistrationDone
    const checkedInTeams = await RegistrationDone.find();
    console.log(`📊 Found ${checkedInTeams.length} checked-in teams in RegistrationDone`);

    let fixedCount = 0;

    for (const registration of checkedInTeams) {
      // Find corresponding team in SelectedTeam
      const team = await SelectedTeam.findOne({ teamId: registration.teamId });
      
      if (team && !team.isCheckedIn) {
        // Fix the status
        team.isCheckedIn = true;
        team.checkInTime = registration.checkInTime;
        await team.save();
        
        console.log(`✅ Fixed: ${team.teamId} - ${team.teamName}`);
        fixedCount++;
      }
    }

    console.log(`\n📊 Fixed ${fixedCount} teams`);
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixCheckedInStatus();