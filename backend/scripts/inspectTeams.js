import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { SelectedTeam } from '../models/Team.js';

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hackmce5';

async function inspect() {
  try {
    await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('✅ Connected to MongoDB for inspection');

    const teams = await SelectedTeam.find().limit(10).lean();
    if (!teams || teams.length === 0) {
      console.log('⚠️  No teams found in SelectedTeam collection');
      process.exit(0);
    }

    teams.forEach((t, i) => {
      console.log(`\nSample ${i + 1}:`);
      console.log(`  teamId: ${t.teamId}`);
      console.log(`  teamName: ${t.teamName}`);
      console.log(`  members (${Array.isArray(t.members) ? t.members.length : 'n/a'}): ${JSON.stringify(t.members)}`);
      console.log(`  raw doc keys: ${Object.keys(t).join(', ')}`);
    });

    process.exit(0);
  } catch (err) {
    console.error('Inspection error:', err);
    process.exit(1);
  }
}

inspect();
