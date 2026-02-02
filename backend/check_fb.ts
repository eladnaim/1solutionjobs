import admin from 'firebase-admin';
import { db } from './db.js';

async function checkFBConnection() {
    console.log("Checking Facebook connection status...\n");

    // Check session cookies
    const sessionDoc = await db.collection('settings').doc('facebook_session_cookies').get();
    if (sessionDoc.exists) {
        const data = sessionDoc.data();
        console.log("✅ Session cookies found");
        console.log(`   Connected: ${data?.connected}`);
        console.log(`   Last updated: ${data?.updated_at?.toDate()}`);

        // Parse and check cookies
        if (data?.storageState) {
            const state = JSON.parse(data.storageState);
            console.log(`   Cookies count: ${state.cookies?.length || 0}`);
            console.log(`   Origins count: ${state.origins?.length || 0}`);
        }
    } else {
        console.log("❌ No session cookies found");
    }

    console.log("\n");

    // Check page settings
    const fbSettingsDoc = await db.collection('settings').doc('facebook').get();
    if (fbSettingsDoc.exists) {
        const settings = fbSettingsDoc.data();
        console.log("✅ Facebook page settings found");
        console.log(`   Page ID: ${settings?.page_id}`);
        console.log(`   Page Name: ${settings?.page_name}`);
        console.log(`   Last updated: ${settings?.updated_at?.toDate()}`);
    } else {
        console.log("❌ No Facebook page settings found");
    }

    console.log("\n");

    // Check groups
    const groupsSnapshot = await db.collection('groups').get();
    console.log(`📊 Groups in database: ${groupsSnapshot.size}`);
    groupsSnapshot.forEach(doc => {
        const g = doc.data();
        console.log(`   - ${g.name} (Member: ${g.is_member ? '✅' : '❌'})`);
    });

    console.log("\n");

    // Check recent publish requests
    const requestsSnapshot = await db.collection('publish_requests')
        .orderBy('created_at', 'desc')
        .limit(3)
        .get();

    console.log(`📤 Recent publish requests: ${requestsSnapshot.size}`);
    requestsSnapshot.forEach(doc => {
        const r = doc.data();
        console.log(`   - ${r.job_title?.substring(0, 40)}...`);
        console.log(`     Status: ${r.status}`);
        console.log(`     Platforms: ${r.platforms?.join(', ')}`);
        console.log(`     Target Page: ${r.target_page_id}`);
        console.log(`     Target Groups: ${r.target_groups?.length || 0}`);
        if (r.results) {
            console.log(`     Results: ${JSON.stringify(r.results)}`);
        }
        console.log('');
    });
}

checkFBConnection().catch(console.error);
