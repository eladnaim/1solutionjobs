
import { db } from './db.js';

async function getJob() {
    try {
        const jobs = await db.collection('jobs').limit(1).get();
        if (jobs.empty) {
            console.log('NO_JOBS');
        } else {
            console.log('JOB_ID:' + jobs.docs[0].id);
        }
    } catch (e) {
        console.error(e);
    }
}

getJob();
