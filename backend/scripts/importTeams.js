// to import data from excel file into MongoDB use this command:
// npm run import --prefix backend

import mongoose from 'mongoose';
import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { SelectedTeam } from '../models/Team.js';

dotenv.config(); // Load environment variables

// Fix __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// MongoDB Connection - Use Atlas or local
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hackmce5';

async function importTeamsFromExcel() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    // Read Excel file
    const excelFilePath = path.join(__dirname, '../data/SelectedTeams.xlsx');
    console.log('📂 Reading Excel file:', excelFilePath);

    const workbook = XLSX.readFile(excelFilePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert to JSON
    const data = XLSX.utils.sheet_to_json(worksheet);
    console.log(`📊 Found ${data.length} rows in Excel file`);

    if (data.length === 0) {
      console.log('⚠️  No data found in Excel file');
      process.exit(0);
    }

    // Show first row to see column names
    console.log('\n📋 First row sample:', JSON.stringify(data[0], null, 2));
    console.log('\n📋 Available columns:', Object.keys(data[0]));

    // Ask user to confirm before clearing
    console.log('\n⚠️  This will CLEAR existing data and import fresh data!');
    
    // Clear existing data
    const deletedCount = await SelectedTeam.deleteMany({});
    console.log(`🗑️  Cleared ${deletedCount.deletedCount} existing teams\n`);

    // Import teams
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      try {
        // Normalize keys to handle case/space/underscore differences
        const normalizeKey = k => k.toString().toLowerCase().replace(/[^a-z0-9]/g, '');
        const normRow = {};
        Object.keys(row).forEach(k => {
          const nk = normalizeKey(k);
          normRow[nk] = row[k];
        });

        const get = (...variants) => {
          for (const v of variants) {
            const key = normalizeKey(v);
            if (Object.prototype.hasOwnProperty.call(normRow, key) && normRow[key] !== undefined && normRow[key] !== null) {
              return normRow[key];
            }
          }
          return undefined;
        };

        const teamData = {
          teamId: (get('Team ID', 'TeamID', 'team_id', 'id', 'ID', 'Team No', 'TEAM NO') || `HACK${String(i + 1).padStart(3, '0')}`)
            .toString().trim().toUpperCase(),

          teamName: (get('Team Name', 'TeamName', 'team_name', 'name', 'Name', 'TEAM NAME') || '')
            .toString().trim(),

         
          members: [
            get('member1 name', 'Member 1', 'member_1', 'Member1', 'member1'),
            get('member2 name', 'Member 2', 'member_2', 'Member2', 'member2'),
            get('member3 name', 'Member 3', 'member_3', 'Member3', 'member3'),
            get('member4 name', 'Member 4', 'member_4', 'Member4', 'member4')
          ].filter(member => member && member.toString().trim() !== '')
           .map(member => member.toString().trim()),

        
          isCheckedIn: false,
          checkInTime: null
        };

        // Validate required fields
        if (!teamData.teamId) {
          errors.push({ row: i + 1, error: 'Missing Team ID' });
          errorCount++;
          continue;
        }

        if (!teamData.teamName || teamData.teamName === '') {
          errors.push({ 
            row: i + 1, 
            teamId: teamData.teamId, 
            error: 'Missing Team Name' 
          });
          errorCount++;
          continue;
        }

        // Create team
        await SelectedTeam.create(teamData);
        successCount++;
        console.log(`✅ Row ${i + 1}: ${teamData.teamId} - ${teamData.teamName}`);

      } catch (error) {
        console.error(`❌ Row ${i + 1} Error:`, error.message);
        errors.push({ 
          row: i + 1, 
          error: error.message 
        });
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 IMPORT SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Successfully imported: ${successCount} teams`);
    console.log(`❌ Failed to import: ${errorCount} teams`);
    console.log(`📈 Total teams in database: ${await SelectedTeam.countDocuments()}`);
    
    if (errors.length > 0 && errors.length <= 10) {
      console.log('\n❌ Errors:');
      errors.forEach(err => {
        console.log(`   Row ${err.row}: ${err.error}${err.teamId ? ` (Team ID: ${err.teamId})` : ''}`);
      });
    } else if (errors.length > 10) {
      console.log(`\n❌ ${errors.length} errors occurred (showing first 10):`);
      errors.slice(0, 10).forEach(err => {
        console.log(`   Row ${err.row}: ${err.error}${err.teamId ? ` (Team ID: ${err.teamId})` : ''}`);
      });
    }

    console.log('='.repeat(60) + '\n');

    // Show sample of imported data
    const sampleTeams = await SelectedTeam.find().limit(3);
    console.log('📋 Sample of imported teams:');
    sampleTeams.forEach(team => {
      console.log(`   ${team.teamId} - ${team.teamName} (${team.members.length} members)`);
    });

    process.exit(0);

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run import
importTeamsFromExcel();