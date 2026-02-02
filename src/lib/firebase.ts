import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    // We will load these from environment variables or hardcode for local dev if needed for now
    // IMPORTANT: For production, use env variables
    projectId: "onesolutionsystem-fac58",
    // Add other config details if you have them, otherwise it might auto-detect in some environments
    // or we will need to update this file with the actual config keys.
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
