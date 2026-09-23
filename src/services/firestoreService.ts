import {
  collection,
  doc,
  setDoc,
  updateDoc,
  getDocs,
  query,
  onSnapshot,
  writeBatch,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import firebaseConfig from '../../firebase-applet-config.json';
import { Complaint, ComplaintStatus } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  databaseId: string;
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

/**
 * Standard error handler logging structured context as required by skill guidelines
 */
export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): Error {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: errorMessage,
    operationType,
    path,
    databaseId: firebaseConfig.firestoreDatabaseId,
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
  };

  console.error('[Firestore Error Details]:', JSON.stringify(errInfo, null, 2));
  return new Error(JSON.stringify(errInfo));
}

/**
 * Sanitizes object by removing `undefined` properties, which the Firestore SDK forbids.
 */
export function sanitizeForFirestore<T>(data: T): any {
  if (data === null || data === undefined) return null;
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForFirestore(item));
  }
  if (typeof data === 'object') {
    const clean: Record<string, any> = {};
    for (const [key, value] of Object.entries(data as Record<string, any>)) {
      if (value !== undefined) {
        clean[key] = sanitizeForFirestore(value);
      }
    }
    return clean;
  }
  return data;
}

/**
 * Persists a complaint to the Firestore "complaints" collection.
 * Throws on failure so UI can show a visible alert and console logs are generated.
 */
export async function saveComplaintToFirestore(complaint: Complaint): Promise<{ docId: string; databaseId: string }> {
  const docPath = `complaints/${complaint.id}`;
  const databaseId = firebaseConfig.firestoreDatabaseId;

  console.log(`[Firestore] Writing complaint to ${docPath} in database "${databaseId}"...`, complaint);

  try {
    const complaintRef = doc(db, 'complaints', complaint.id);
    const cleanPayload = sanitizeForFirestore({
      ...complaint,
      updatedAt: new Date().toISOString(),
      firestoreDatabaseId: databaseId,
    });

    // Exact Firestore write call
    await setDoc(complaintRef, cleanPayload);

    console.log(`%c[Firestore] ✓ Successfully wrote document "${complaint.id}" to collection "complaints" (DB: ${databaseId})`, 'color: green; font-weight: bold;');
    return { docId: complaint.id, databaseId };
  } catch (err: any) {
    console.error(`%c[Firestore] ✕ Failed to write document "${complaint.id}" to collection "complaints":`, 'color: red; font-weight: bold;', err);
    const handledErr = handleFirestoreError(err, OperationType.WRITE, docPath);
    throw handledErr;
  }
}

/**
 * Updates a complaint's triage status in Firestore
 */
export async function updateComplaintStatusInFirestore(
  complaintId: string,
  newStatus: ComplaintStatus
): Promise<void> {
  const docPath = `complaints/${complaintId}`;
  const databaseId = firebaseConfig.firestoreDatabaseId;
  console.log(`[Firestore] Updating status of ${docPath} to "${newStatus}" in DB "${databaseId}"...`);

  try {
    const complaintRef = doc(db, 'complaints', complaintId);
    await updateDoc(complaintRef, {
      status: newStatus,
      updatedAt: new Date().toISOString(),
    });
    console.log(`[Firestore] ✓ Status updated for ${docPath}`);
  } catch (err) {
    console.error(`[Firestore] ✕ Failed to update status for ${docPath}:`, err);
    throw handleFirestoreError(err, OperationType.UPDATE, docPath);
  }
}

/**
 * Subscribes to the live Firestore "complaints" collection in real-time.
 * Every change in Firestore automatically updates the subscriber.
 */
export function subscribeToLiveComplaints(
  onUpdate: (complaints: Complaint[]) => void,
  onError?: (err: Error) => void
): () => void {
  const collectionPath = 'complaints';
  const databaseId = firebaseConfig.firestoreDatabaseId;
  const q = query(collection(db, collectionPath));

  console.log(`[Firestore] Subscribing to live real-time query on collection "${collectionPath}" in DB "${databaseId}"...`);

  return onSnapshot(
    q,
    (snapshot) => {
      const liveComplaints: Complaint[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Complaint;
        if (data && data.id) {
          liveComplaints.push(data);
        }
      });

      // Sort by timestamp descending (most recent first)
      liveComplaints.sort((a, b) => {
        const timeA = new Date(a.timestamp || 0).getTime();
        const timeB = new Date(b.timestamp || 0).getTime();
        return timeB - timeA;
      });

      console.log(`%c[Firestore onSnapshot] Received ${liveComplaints.length} live complaints from Firestore.`, 'color: #0284c7; font-weight: bold;');
      onUpdate(liveComplaints);
    },
    (error) => {
      console.error('[Firestore onSnapshot error]:', error);
      const handled = handleFirestoreError(error, OperationType.LIST, collectionPath);
      if (onError) onError(handled);
    }
  );
}

/**
 * Seeds sample complaints directly into Firestore collection "/complaints" if empty or requested.
 * Each sample becomes a real document in the database with the exact schema.
 */
export async function seedSampleComplaintsToFirestore(
  sampleComplaints: Complaint[]
): Promise<{ insertedCount: number; databaseId: string }> {
  const databaseId = firebaseConfig.firestoreDatabaseId;
  console.log(`[Firestore Seed] Seeding ${sampleComplaints.length} sample complaints into collection "complaints" (DB: ${databaseId})...`);

  let count = 0;
  // Write each sample document to Firestore
  for (const sample of sampleComplaints) {
    try {
      const complaintRef = doc(db, 'complaints', sample.id);
      const cleanData = sanitizeForFirestore({
        ...sample,
        seededAt: new Date().toISOString(),
        firestoreDatabaseId: databaseId,
      });
      await setDoc(complaintRef, cleanData);
      count++;
    } catch (err) {
      console.error(`[Firestore Seed] Error inserting sample ${sample.id}:`, err);
    }
  }

  console.log(`%c[Firestore Seed] ✓ Successfully seeded ${count} documents into Firestore "complaints" collection.`, 'color: green; font-weight: bold;');
  return { insertedCount: count, databaseId };
}

/**
 * Loads complaints once from Firestore
 */
export async function loadComplaintsFromFirestore(): Promise<Complaint[]> {
  const collectionPath = 'complaints';
  try {
    const snapshot = await getDocs(collection(db, collectionPath));
    const list: Complaint[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as Complaint;
      if (data && data.id) {
        list.push(data);
      }
    });
    return list;
  } catch (err) {
    console.warn('[Firestore] Error loading complaints:', err);
    return [];
  }
}
