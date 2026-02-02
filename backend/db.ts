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
        const fbPrivateKey = process.env.FB_PRIVATE_KEY;
        const fbClientEmail = process.env.FB_CLIENT_EMAIL;
        const fbProjectId = process.env.FB_PROJECT_ID;

        if (fbPrivateKey && fbClientEmail && fbProjectId) {
            console.log("[Firebase] Using independent environment variables");
            creds = {
                projectId: fbProjectId,
                clientEmail: fbClientEmail,
                privateKey: fbPrivateKey.replace(/\\n/g, '\n')
            };
        } else if (envServiceAccount) {
            console.log("[Firebase] Using FIREBASE_SERVICE_ACCOUNT JSON blob");
            try {
                creds = JSON.parse(envServiceAccount);
            } catch (pError: any) {
                console.warn("[Firebase] Initial JSON parse failed, attempting deep clean...");
                const cleaned = envServiceAccount.replace(/\\n/g, '\n');
                try {
                    creds = JSON.parse(cleaned);
                } catch (e: any) {
                    throw new Error(`Failed to parse Firebase credentials: ${pError.message}`);
                }
            }
        } else {
            console.log("[Firebase] Falling back to service-account.json file");
            const keyPath = path.resolve(process.cwd(), 'service-account.json');
            if (fs.existsSync(keyPath)) {
                creds = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
            } else {
                throw new Error("No Firebase credentials found in environment or file");
            }
        }

        // Standardize keys for the final credential.cert call if needed
        const finalCreds = {
            projectId: creds.project_id || creds.projectId,
            clientEmail: creds.client_email || creds.clientEmail,
            privateKey: (creds.private_key || creds.privateKey || '').replace(/\\n/g, '\n')
        };

        admin.initializeApp({
            projectId: finalCreds.projectId,
            credential: admin.credential.cert(finalCreds)
        });
        console.log("[Firebase] Admin Initialized Successfully");
    } catch (error: any) {
        console.error("[Firebase] Initialization Failed:", error.message);
    }
}

export const db = admin.firestore();
export const auth = admin.auth();
