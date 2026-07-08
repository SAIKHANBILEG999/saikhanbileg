import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
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
export const auth = getAuth(app);

// -----------------------------------------
// STRUCTURED FIRESTORE ERROR HANDLING (Skill requirement)
// -----------------------------------------
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error Detailed: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
// -----------------------------------------

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
  const path = "scores";
  try {
    const scoresRef = collection(db, path);
    const docRef = await addDoc(scoresRef, {
      name: name.trim() || "Anonymous",
      score: score,
      mode: mode,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error; // keep TS happy, though handleFirestoreError throws
  }
}

/**
 * Fetches the TOP 10 scores from the "scores" collection in Firestore, 
 * sorted by score descending, then by createdAt descending.
 */
export async function getLeaderboard(mode: string): Promise<LeaderboardEntry[]> {
  const path = "scores";
  try {
    const scoresRef = collection(db, path);
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
    console.warn("First attempt to fetch leaderboard failed, trying fallback:", error);
    // Fallback: if index error or other, try without mode filtering
    try {
      const scoresRef = collection(db, path);
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
      handleFirestoreError(fallbackError, OperationType.GET, path);
      return [];
    }
  }
}

export interface UserReview {
  id?: string;
  name: string;
  rating: number; // 1 to 5
  movieTitle: string; // "Harry Potter", "Volleyball", etc.
  reviewText: string;
  createdAt?: any;
}

/**
 * Saves a user review to the "reviews" collection in Firestore.
 */
export async function saveReview(review: Omit<UserReview, "id">): Promise<string> {
  const path = "reviews";
  try {
    const reviewsRef = collection(db, path);
    const docRef = await addDoc(reviewsRef, {
      name: review.name.trim() || "Anonymous",
      rating: Number(review.rating) || 5,
      movieTitle: review.movieTitle.trim() || "General",
      reviewText: review.reviewText.trim(),
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
}

/**
 * Fetches the latest reviews from the "reviews" collection in Firestore.
 */
export async function getReviews(movieTitle?: string): Promise<UserReview[]> {
  const path = "reviews";
  try {
    const reviewsRef = collection(db, path);
    // Retrieve latest reviews. We'll fetch and sort by createdAt if available, or just fetch all
    const q = query(reviewsRef, orderBy("createdAt", "desc"), limit(50));
    const querySnapshot = await getDocs(q);
    const reviews: UserReview[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (!movieTitle || data.movieTitle === movieTitle) {
        reviews.push({
          id: doc.id,
          name: data.name,
          rating: data.rating,
          movieTitle: data.movieTitle,
          reviewText: data.reviewText,
          createdAt: data.createdAt
        });
      }
    });
    
    return reviews;
  } catch (error) {
    console.warn("First attempt to fetch reviews failed, trying fallback:", error);
    // Fallback: without orderBy in case index isn't created yet
    try {
      const reviewsRef = collection(db, path);
      const querySnapshot = await getDocs(reviewsRef);
      const reviews: UserReview[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (!movieTitle || data.movieTitle === movieTitle) {
          reviews.push({
            id: doc.id,
            name: data.name,
            rating: data.rating,
            movieTitle: data.movieTitle,
            reviewText: data.reviewText,
            createdAt: data.createdAt
          });
        }
      });
      // Sort client-side
      return reviews.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
    } catch (fallbackErr) {
      handleFirestoreError(fallbackErr, OperationType.GET, path);
      return [];
    }
  }
}
