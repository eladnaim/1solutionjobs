
import { db } from './db.js';

async function setCredentials(pageId: string, accessToken: string) {
    console.log(`Setting Facebook Graph credentials for Page ID: ${pageId}...`);

    await db.collection('settings').doc('facebook_graph').set({
        page_id: pageId,
        access_token: accessToken,
        updated_at: new Date()
    });

    // Also update the main 'facebook' settings for compatibility
    await db.collection('settings').doc('facebook').update({
        page_id: pageId,
        access_token: accessToken,
        updated_at: new Date()
    }).catch(e => {
        console.log("Creating main facebook settings doc...");
        return db.collection('settings').doc('facebook').set({
            page_id: pageId,
            access_token: accessToken,
            updated_at: new Date()
        });
    });

    console.log("✅ Credentials saved successfully in Firestore!");
    process.exit(0);
}

const args = process.argv.slice(2);
if (args.length < 2) {
    console.log("Usage: npx tsx backend/set_graph_credentials.ts <PAGE_ID> <ACCESS_TOKEN>");
    process.exit(1);
}

setCredentials(args[0], args[1]);
