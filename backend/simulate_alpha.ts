
import { db } from './db.js';
import admin from 'firebase-admin';
import { checkNewCandidateAgainstRequirements } from './matchingEngine.js';

async function simulateAlphaFlow() {
    console.log("🚀 [Alpha Alpha] Starting Simulation...");

    // 1. Create a Hot Requirement
    const reqRef = db.collection('hot_requirements').doc('alpha_demo_req');
    await reqRef.set({
        company: 'Intel Israel',
        role: 'מנהל תפעול ולוגיסטיקה',
        location: 'קריית גת',
        description: 'דרוש פורש צה"ל עם ניסיון פיקודי ותפעול מערכות מורכבות. יתרון לקצינים בדרגת רס"ן ומעלה.',
        created_at: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log("✅ Step 1: Employer Requirement Created (Alpha Demo).");

    // 2. Submit a Veteran Lead (Simulating the Funnel)
    const candidateData = {
        full_name: 'אל״ם (מיל׳) דניאל רז',
        phone: '054-1234567',
        type: 'veteran',
        role_type: 'management',
        experience: '25 שנות שירות במערך הלוגיסטי',
        military_unit: 'אט״ל',
        notes: 'פורש טרי, מעוניין בתפקידי ניהול תפעול בכיר באזור הדרום.',
        status: 'active',
        created_at: admin.firestore.FieldValue.serverTimestamp()
    };

    const candRef = await db.collection('candidates').add(candidateData);
    console.log("✅ Step 2: Veteran Lead Submitted (Alpha Funnel). ID: " + candRef.id);

    // 3. Trigger Matching Engine
    console.log("🧠 Step 3: Running AI Matching Engine...");
    const matches = await checkNewCandidateAgainstRequirements(candidateData);

    console.log("🎯 Match Results:");
    matches.forEach((m: any) => {
        console.log(`- Match Score: ${m.score}% | Reason: ${m.reason}`);
    });

    if (matches.length > 0) {
        console.log("🔥 ALPHA SUCCESS: Direct match found between Veteran and Employer Requirement!");
    } else {
        console.log("⚠️ Alpha Note: No immediate high-score match found in demo, check Hot Requirements list.");
    }
}

simulateAlphaFlow();
