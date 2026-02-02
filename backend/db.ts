import admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

// Prevent multiple initializations
if (!admin.apps.length) {
    try {
        let creds: any;
        const envServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;

        if (envServiceAccount) {
            creds = JSON.parse(envServiceAccount);
        } else {
            const keyPath = path.resolve(process.cwd(), 'service-account.json');
            creds = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
        }

        admin.initializeApp({
            projectId: process.env.VITE_FIREBASE_PROJECT_ID || "onesolutionsystem-fac58",
            credential: admin.credential.cert(creds)
        });
        console.log("[Firebase] Admin Initialized Successfully");
    } catch (error) {
        console.error("[Firebase] Initialization Failed:", error);
    }
}

export const db = admin.firestore();
export const auth = admin.auth();
