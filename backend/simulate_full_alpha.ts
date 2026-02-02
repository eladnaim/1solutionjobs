import admin from 'firebase-admin';
import { db } from './db.js';
import { runAutoPilotBatch } from './publishEngine.js';
import { checkNewCandidateAgainstRequirements } from './matchingEngine.js';
import { generateJobContent } from './contentEngine.js';

async function simulateFullAlpha() {
    console.log("🚀 [Alpha Full] Starting Comprehensive System Simulation...");

    // 1. Seed Real-world Groups (Layer 4)
    console.log("📂 Step 1: Seeding Optimized Facebook Groups...");
    const groupsRef = db.collection('facebook_groups');
    const demoGroups = [
        { name: 'דרושים באר שבע והדרום', url: 'https://fb.com/groups/southjobs', location_tags: ['דרום', 'באר שבע'], keywords: ['general', 'all'], is_member: true },
        { name: 'משרות אבטחה וביטחון', url: 'https://fb.com/groups/securityjobs', keywords: ['אבטחה', 'ביטחון', 'קב"ט'], is_member: true },
        { name: 'הייטק דרום - Jobs', url: 'https://fb.com/groups/hitech_south', location_tags: ['דרום', 'באר שבע'], keywords: ['tech', 'סייבר', '8200'], is_member: true }
    ];
    for (const g of demoGroups) {
        await groupsRef.add(g);
    }
    console.log("✅ Groups Seeded.");

    // 2. Create a "Hot Job" (Layer 2.2 Simulate)
    console.log("💼 Step 2: Creating a High-Quality Job Listing...");
    const jobId = 'full_alpha_demo_job';
    const rawDesc = `
    דרוש ראש צוות אבטחה לפרויקט אסטרטגי בבאר שבע.
    דרישות:
    - ניסיון פיקודי משמעותי (יוצאי יחידות קרביות/קצינים - יתרון משמעותי)
    - מגורים באזור דרום / באר שבע
    - נכונות לעבודה במשרות אמון
    `;

    // Generate AI Content (Layer 3)
    console.log("🪄 Generating Professional & Viral Content...");
    const aiContent = await generateJobContent({
        original_title: 'ראש צוות אבטחה',
        description: rawDesc,
        location: 'באר שבע'
    });

    await db.collection('jobs').doc(jobId).set({
        id: jobId,
        title: 'ראש צוות אבטחה',
        location: 'באר שבע',
        description_clean: rawDesc,
        is_full_scrape: true,
        status: 'active',
        application_link: 'https://svt.jobs/apply/demo',
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        ...aiContent
    });
    console.log("✅ High-Quality Job Created with AI Content.");

    // 3. Trigger Auto-Pilot (Layer 4 & 5)
    console.log("🤖 Step 3: Triggering Layer 4 Auto-Pilot...");
    await runAutoPilotBatch(1);
    console.log("✅ Auto-Pilot Execution Finished.");

    // 4. Submit a Lead & Check Matching (Layer 7)
    console.log("👤 Step 4: Simulating Veteran Lead Submission...");
    const candidateData = {
        full_name: 'יוסי כהן (מיל\')',
        phone: '050-9876543',
        type: 'veteran',
        role_type: 'security',
        experience: 'מ"פ במילואים, 15 שנות שירות קרבי',
        location: 'באר שבע',
        military_unit: 'חטיבת הקומנדו',
        assigned_team: '1solution & צוות מחוז דרום',
        created_at: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('candidates').add(candidateData);
    console.log("✅ Lead Captured in CRM.");

    console.log("🧠 Thinking: Matching Lead against Hot Requirements...");
    // We need a 'hot_requirement' to match against
    await db.collection('hot_requirements').doc('alpha_req_1').set({
        role: 'ראש צוות אבטחה',
        location: 'באר שבע',
        company: 'Strategic Defense Ltd',
        created_at: admin.firestore.FieldValue.serverTimestamp()
    });

    const matches = await checkNewCandidateAgainstRequirements(candidateData);
    console.log("🎯 Match Results Found:", matches.length);
    matches.forEach((m: any) => {
        console.log(`- Match Score: ${m.score}% | Reason: ${m.reason}`);
    });

    console.log("\n🏁 [Alpha Full] Simulation Complete. System is READY for pilot.");
}

simulateFullAlpha().catch(console.error);
