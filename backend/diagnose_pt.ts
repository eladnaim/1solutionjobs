
import admin from 'firebase-admin';
import { db } from './db.js';
import { GeoEngine } from './geoEngine.js';

async function diagnosePT() {
    console.log("🔍 Checking Petah Tikva Recommendations...");

    // 1. Check raw groups in DB
    const snapshot = await db.collection('facebook_groups').get();
    const allGroups = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    const ptGroups = allGroups.filter((g: any) => g.name.includes('פתח תקווה') || g.name.includes('פ"ת'));
    console.log(`📊 Found ${ptGroups.length} groups with 'Petah Tikva' in name.`);
    ptGroups.forEach((g: any) => console.log(`   - ${g.name} (Tags: ${g.location_tags}, Region: ${g.region})`));

    // 2. Test Engine Logic
    console.log("\n🧪 Testing GeoEngine Logic:");
    const jobLocation = "פתח תקווה";

    if (ptGroups.length > 0) {
        const testGroup = ptGroups[0];
        const score = GeoEngine.getMatchScore(jobLocation, testGroup.name, testGroup.location_tags || [], testGroup.region || 'general');
        console.log(`   Scoring '${jobLocation}' against '${testGroup.name}': ${score}`);
        console.log(`   (Ideally should be > 100)`);
    } else {
        console.log("   ❌ No test group available.");
    }
}

diagnosePT();
