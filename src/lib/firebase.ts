import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  limit, 
  serverTimestamp, 
  Timestamp 
} from "firebase/firestore";

// Config loaded from firebase-applet-config.json
const firebaseConfig = {
  apiKey: "AIzaSyDcmFOdR9-FgG2yJcDDgxYFTqSucsrKO2E",
  authDomain: "inspirational-timer-3gtt6.firebaseapp.com",
  projectId: "inspirational-timer-3gtt6",
  storageBucket: "inspirational-timer-3gtt6.firebasestorage.app",
  messagingSenderId: "994912995405",
  appId: "1:994912995405:web:499e65c2bc3ef956fcf404"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Use the specific firestoreDatabaseId if provided, otherwise default
const databaseId = "ai-studio-cinematichero-e0f1d99b-9f15-44b3-a546-b95108481183";
export const db = getFirestore(app, databaseId);

export interface LeaderboardEntry {
  id?: string;
  name: string;
  score: number;
  mode: string; // "anime" or "character"
  createdAt?: Timestamp;
}

/**
 * Saves a player's score to the "scores" collection in Firestore.
 */
export async function saveScore(name: string, score: number, mode: string): Promise<string> {
  try {
    const scoresRef = collection(db, "scores");
    const docRef = await addDoc(scoresRef, {
      name: name.trim() || "Anonymous",
      score: score,
      mode: mode,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error("Error saving score:", error);
    throw error;
  }
}

/**
 * Fetches the TOP 10 scores from the "scores" collection in Firestore, 
 * sorted by score descending, then by createdAt descending.
 */
export async function getLeaderboard(mode: string): Promise<LeaderboardEntry[]> {
  try {
    const scoresRef = collection(db, "scores");
    // To ensure compatibility with simple or composite indexes, we order by score descending.
    // If the index is not yet built, standard Firestore allows single-field orderBy.
    const q = query(
      scoresRef,
      orderBy("score", "desc"),
      limit(20) // Get top 20 to filter client-side if needed, or limit to 10
    );
    
    const querySnapshot = await getDocs(q);
    const entries: LeaderboardEntry[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      // Filter by mode client-side to avoid requiring composite indexes initially
      if (data.mode === mode) {
        entries.push({
          id: doc.id,
          name: data.name,
          score: data.score,
          mode: data.mode,
          createdAt: data.createdAt
        });
      }
    });
    
    // Sort and limit to top 10 for the specific mode
    return entries.slice(0, 10);
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    // Fallback: if index error or other, try without mode filtering
    try {
      const scoresRef = collection(db, "scores");
      const q = query(scoresRef, orderBy("score", "desc"), limit(30));
      const querySnapshot = await getDocs(q);
      const entries: LeaderboardEntry[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.mode === mode) {
          entries.push({
            id: doc.id,
            name: data.name,
            score: data.score,
            mode: data.mode,
            createdAt: data.createdAt
          });
        }
      });
      return entries.slice(0, 10);
    } catch (fallbackError) {
      console.error("Fallback fetching leaderboard failed:", fallbackError);
      return [];
    }
  }
}
