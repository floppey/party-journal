// Optimized notes caching hook
"use client";
import { useEffect, useState, useRef } from "react";
import { collection, onSnapshot, query, Timestamp } from "firebase/firestore";
import { db } from "../firebase";

// Lightweight note info for sidebar and navigation
export interface NoteInfo {
  id: string;
  title: string;
  parentId: string | null;
  noteType: "note" | "folder";
  updatedAt: Timestamp | null;
  createdBy: string;
}

class NotesCache {
  private static instance: NotesCache;
  private notes: Map<string, NoteInfo> = new Map();
  private subscribers: Set<(notes: NoteInfo[]) => void> = new Set();
  private isSubscribed = false;
  private unsubscribe: (() => void) | null = null;

  static getInstance(): NotesCache {
    if (!NotesCache.instance) {
      NotesCache.instance = new NotesCache();
    }
    return NotesCache.instance;
  }

  subscribe(callback: (notes: NoteInfo[]) => void): () => void {
    this.subscribers.add(callback);

    // Start Firebase subscription if this is the first subscriber
    if (!this.isSubscribed) {
      this.startFirebaseSubscription();
    }

    // Immediately call with current data if available
    if (this.notes.size > 0) {
      callback(Array.from(this.notes.values()));
    }

    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback);

      // Stop Firebase subscription if no more subscribers
      if (this.subscribers.size === 0) {
        this.stopFirebaseSubscription();
      }
    };
  }

  private startFirebaseSubscription() {
    if (this.isSubscribed) return;

    console.log("🔥 Starting optimized Firebase notes subscription");

    // Only fetch the fields we need for navigation
    const notesQuery = query(collection(db, "notes"));

    this.unsubscribe = onSnapshot(
      notesQuery,
      (snapshot) => {
        console.log(`📥 Received ${snapshot.docs.length} notes from Firebase`);

        // Update cache
        this.notes.clear();
        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          if (data.deleted) return; // skip soft-deleted notes
          this.notes.set(doc.id, {
            id: doc.id,
            title: data.title ?? "",
            parentId: data.parentId ?? null,
            noteType: data.noteType ?? "note",
            updatedAt: data.updatedAt,
            createdBy: data.createdBy ?? "",
          });
        });

        // Notify all subscribers
        const notesArray = Array.from(this.notes.values());
        this.subscribers.forEach((callback) => callback(notesArray));
      },
      (error) => {
        console.error("❌ Firebase notes subscription error:", error);
      }
    );

    this.isSubscribed = true;
  }

  private stopFirebaseSubscription() {
    if (this.unsubscribe) {
      console.log("🛑 Stopping Firebase notes subscription");
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.isSubscribed = false;
  }

  // Get cached note info without triggering Firebase request
  getNoteInfo(id: string): NoteInfo | undefined {
    return this.notes.get(id);
  }

  // Get all cached notes
  getAllNotes(): NoteInfo[] {
    return Array.from(this.notes.values());
  }

  // Check if we have any notes (for home page)
  hasNotes(): boolean {
    return this.notes.size > 0;
  }
}

// Hook for components to use the cached notes
export function useNotesCache() {
  const [notes, setNotes] = useState<NoteInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const cache = useRef(NotesCache.getInstance());

  useEffect(() => {
    const unsubscribe = cache.current.subscribe((notesArray) => {
      setNotes(notesArray);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return {
    notes,
    loading,
    hasNotes: notes.length > 0,
    getNoteInfo: (id: string) => cache.current.getNoteInfo(id),
  };
}

// Lightweight hook just for checking if notes exist (home page)
export function useHasNotes() {
  const [hasNotes, setHasNotes] = useState(false);
  const [loading, setLoading] = useState(true);
  const cache = useRef(NotesCache.getInstance());

  useEffect(() => {
    const unsubscribe = cache.current.subscribe((notesArray) => {
      setHasNotes(notesArray.length > 0);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return { hasNotes, loading };
}
