
import { db } from './db.js';

async function checkLatestRequest() {
    try {
        const reqs = await db.collection('publish_requests').orderBy('created_at', 'desc').limit(1).get();
        if (reqs.empty) {
            console.log("No requests found");
        } else {
            console.log("ID: " + reqs.docs[0].id);
            console.log(JSON.stringify(reqs.docs[0].data(), null, 2));
        }
    } catch (e) {
        console.error(e);
    }
}

checkLatestRequest();
