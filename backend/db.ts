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
            try {
                creds = JSON.parse(envServiceAccount);
            } catch (pError) {
                console.warn("[Firebase] Initial JSON parse failed, attempting deep clean...");
                // Fix common escaping issues in Vercel env vars
                const cleaned = envServiceAccount
                    .replace(/\\n/g, '\n') // Fix literal \n
                    .replace(/\n/g, '\\n'); // Ensure newlines are escaped for JSON

                // If the key is just sitting as a raw string with literal newlines, JSON.parse will fail.
                // Vercel UI often mangles these.
                try {
                    creds = JSON.parse(cleaned);
                } catch (e) {
                    throw new Error(`Failed to parse Firebase credentials even after cleaning: ${pError.message}`);
                }
            }
        } else {
            const keyPath = path.resolve(process.cwd(), 'service-account.json');
            creds = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
        }

        // Clean up the private key manually just in case
        if (creds && creds.private_key) {
            creds.private_key = creds.private_key.replace(/\\n/g, '\n');
        }

        admin.initializeApp({
            projectId: creds.project_id || process.env.VITE_FIREBASE_PROJECT_ID || "onesolutionsystem-fac58",
            credential: admin.credential.cert(creds)
        });
        console.log("[Firebase] Admin Initialized Successfully");
    } catch (error: any) {
        console.error("[Firebase] Initialization Failed:", error.message);
    }
}

export const db = admin.firestore();
export const auth = admin.auth();
