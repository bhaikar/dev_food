require('dotenv').config();
const mongoose = require('mongoose');
const { SelectedTeam, RegistrationDone } = require('../models/Team');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hackmce5';

async function syncCheckedInData() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all checked-in teams from registrationdones collection
    const checkedInTeams = await RegistrationDone.find();
    console.log(`📊 Found ${checkedInTeams.length} teams in registrationdones collection\n`);

    if (checkedInTeams.length === 0) {
      console.log('⚠️  No teams found in registrationdones collection');
      console.log('This means no teams have checked in yet.\n');
      process.exit(0);
    }

    let updatedCount = 0;
    let notFoundCount = 0;
    let alreadyCorrect = 0;

    console.log('🔄 Syncing data to selectedteams collection...\n');

    for (const registration of checkedInTeams) {
      // Find the team in selectedteams collection
      const team = await SelectedTeam.findOne({ teamId: registration.teamId });

      if (!team) {
        console.log(`⚠️  Team ${registration.teamId} not found in selectedteams collection`);
        notFoundCount++;
        continue;
      }

      // Check if already correct
      if (team.isCheckedIn && team.checkInTime) {
        console.log(`✓ ${team.teamId} - ${team.teamName} (already synced)`);
        alreadyCorrect++;
        continue;
      }

      // Update the team
      team.isCheckedIn = true;
      team.checkInTime = registration.checkInTime;
      await team.save();

      console.log(`✅ ${team.teamId} - ${team.teamName} (synced)`);
      updatedCount++;
    }

    console.log('\n' + '='.repeat(70));
    console.log('📊 SYNC SUMMARY');
    console.log('='.repeat(70));
    console.log(`✅ Updated: ${updatedCount} teams`);
    console.log(`✓ Already synced: ${alreadyCorrect} teams`);
    console.log(`⚠️  Not found in selectedteams: ${notFoundCount} teams`);
    console.log(`📈 Total in registrationdones: ${checkedInTeams.length} teams`);
    console.log('='.repeat(70));

    // Verify
    console.log('\n🔍 Verifying sync...');
    const verifyCount = await SelectedTeam.countDocuments({ isCheckedIn: true });
    console.log(`✅ Teams with isCheckedIn=true in selectedteams: ${verifyCount}`);
    console.log(`📊 Teams in registrationdones: ${checkedInTeams.length}`);

    if (verifyCount === checkedInTeams.length) {
      console.log('\n🎉 SUCCESS! All data is now synced!\n');
      console.log('Now refresh your admin panel - teams should show as "Checked In" ✓\n');
    } else {
      console.log('\n⚠️  Warning: Counts do not match.');
      console.log(`Missing: ${checkedInTeams.length - verifyCount} teams\n`);
      console.log('Some teams in registrationdones may not exist in selectedteams.');
      console.log('You may need to import your SelectedTeams.xlsx file first.\n');
    }

    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

syncCheckedInData();