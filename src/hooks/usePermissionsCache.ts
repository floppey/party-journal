// Optimized permissions caching system
"use client";
import { useEffect, useState, useRef } from "react";
import { UserRole } from "../permissions";

interface PermissionResult {
  isAllowed: boolean;
  canEdit: boolean;
  isAdmin: boolean;
  role: UserRole | null;
}

interface PermissionsCacheData extends PermissionResult {
  email: string;
  timestamp: number;
  loading: boolean;
  error: string | null;
}

class PermissionsCache {
  private static instance: PermissionsCache;
  private cache: Map<string, PermissionsCacheData> = new Map();
  private subscribers: Map<string, Set<(data: PermissionsCacheData) => void>> = new Map();
  private activeRequests: Map<string, Promise<PermissionResult>> = new Map();
  
  // Cache for 5 minutes
  private readonly CACHE_DURATION = 5 * 60 * 1000;

  static getInstance(): PermissionsCache {
    if (!PermissionsCache.instance) {
      PermissionsCache.instance = new PermissionsCache();
    }
    return PermissionsCache.instance;
  }

  subscribe(email: string, callback: (data: PermissionsCacheData) => void): () => void {
    if (!email) {
      // Handle empty email case
      const emptyData: PermissionsCacheData = {
        email: "",
        isAllowed: false,
        canEdit: false,
        isAdmin: false,
        role: null,
        timestamp: Date.now(),
        loading: false,
        error: null,
      };
      callback(emptyData);
      return () => {}; // No-op unsubscribe
    }

    // Add subscriber
    if (!this.subscribers.has(email)) {
      this.subscribers.set(email, new Set());
    }
    this.subscribers.get(email)!.add(callback);

    // Check if we have valid cached data
    const cached = this.cache.get(email);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < this.CACHE_DURATION) {
      // Return cached data immediately
      console.log(`📋 Using cached permissions for ${email}`);
      callback(cached);
    } else {
      // Need to fetch new data
      this.fetchPermissions(email);
    }

    // Return unsubscribe function
    return () => {
      const emailSubscribers = this.subscribers.get(email);
      if (emailSubscribers) {
        emailSubscribers.delete(callback);
        if (emailSubscribers.size === 0) {
          this.subscribers.delete(email);
        }
      }
    };
  }

  private async fetchPermissions(email: string): Promise<void> {
    // Check if there's already an active request for this email
    if (this.activeRequests.has(email)) {
      try {
        const result = await this.activeRequests.get(email)!;
        this.updateCache(email, result, null);
      } catch (error) {
        this.updateCache(email, this.getDefaultPermissions(), error as Error);
      }
      return;
    }

    // Set loading state
    this.updateCache(email, this.getDefaultPermissions(), null, true);

    console.log(`🔄 Fetching permissions for ${email}`);

    // Create the request promise
    const requestPromise = this.makePermissionsRequest(email);
    this.activeRequests.set(email, requestPromise);

    try {
      const result = await requestPromise;
      this.updateCache(email, result, null);
      console.log(`✅ Permissions fetched for ${email}:`, result);
    } catch (error) {
      console.error(`❌ Failed to fetch permissions for ${email}:`, error);
      this.updateCache(email, this.getDefaultPermissions(), error as Error);
    } finally {
      this.activeRequests.delete(email);
    }
  }

  private async makePermissionsRequest(email: string): Promise<PermissionResult> {
    const response = await fetch("/api/permissions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Failed to check permissions`);
    }

    return await response.json();
  }

  private updateCache(
    email: string, 
    permissions: PermissionResult, 
    error: Error | null, 
    loading: boolean = false
  ): void {
    const data: PermissionsCacheData = {
      email,
      ...permissions,
      timestamp: Date.now(),
      loading,
      error: error?.message || null,
    };

    this.cache.set(email, data);

    // Notify all subscribers for this email
    const emailSubscribers = this.subscribers.get(email);
    if (emailSubscribers) {
      emailSubscribers.forEach(callback => callback(data));
    }
  }

  private getDefaultPermissions(): PermissionResult {
    return {
      isAllowed: false,
      canEdit: false,
      isAdmin: false,
      role: null,
    };
  }

  // Debug method to see cache status
  getCacheStatus(): Record<string, {
    email: string;
    isAllowed: boolean;
    canEdit: boolean;
    isAdmin: boolean;
    role: UserRole | null;
    timestamp: number;
    loading: boolean;
    error: string | null;
    age: number;
    subscribers: number;
  }> {
    const status: Record<string, {
      email: string;
      isAllowed: boolean;
      canEdit: boolean;
      isAdmin: boolean;
      role: UserRole | null;
      timestamp: number;
      loading: boolean;
      error: string | null;
      age: number;
      subscribers: number;
    }> = {};
    
    this.cache.forEach((data, email) => {
      status[email] = {
        ...data,
        age: Date.now() - data.timestamp,
        subscribers: this.subscribers.get(email)?.size || 0,
      };
    });
    return status;
  }

  // Method to clear cache (useful for testing or logout)
  clearCache(): void {
    console.log("🗑️ Clearing permissions cache");
    this.cache.clear();
    this.activeRequests.clear();
  }

  // Method to invalidate specific user (useful when permissions change)
  invalidateUser(email: string): void {
    console.log(`🔄 Invalidating permissions cache for ${email}`);
    this.cache.delete(email);
    if (this.subscribers.has(email)) {
      this.fetchPermissions(email);
    }
  }
}

// Optimized hook that uses the cache
export function usePermissions(email: string | null | undefined) {
  const [data, setData] = useState<PermissionsCacheData>({
    email: email || "",
    isAllowed: false,
    canEdit: false,
    isAdmin: false,
    role: null,
    timestamp: 0,
    loading: true,
    error: null,
  });

  const cache = useRef(PermissionsCache.getInstance());

  useEffect(() => {
    if (!email) {
      setData({
        email: "",
        isAllowed: false,
        canEdit: false,
        isAdmin: false,
        role: null,
        timestamp: Date.now(),
        loading: false,
        error: null,
      });
      return;
    }

    const unsubscribe = cache.current.subscribe(email, (newData) => {
      setData(newData);
    });

    return unsubscribe;
  }, [email]);

  return {
    isAllowed: data.isAllowed,
    canEdit: data.canEdit,
    isAdmin: data.isAdmin,
    role: data.role,
    loading: data.loading,
    error: data.error,
  };
}

// Export cache instance for debugging or manual cache management
export const permissionsCache = PermissionsCache.getInstance();
