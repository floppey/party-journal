// Client-side hook for server-side permission checks
"use client";
import { useEffect, useState } from 'react';
import { UserRole } from '../permissions';

interface PermissionResult {
  isAllowed: boolean;
  canEdit: boolean;
  isAdmin: boolean;
  role: UserRole | null;
}

interface UsePermissionsResult extends PermissionResult {
  loading: boolean;
  error: string | null;
}

export function usePermissions(email: string | null | undefined): UsePermissionsResult {
  const [permissions, setPermissions] = useState<PermissionResult>({
    isAllowed: false,
    canEdit: false,
    isAdmin: false,
    role: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!email) {
      setPermissions({
        isAllowed: false,
        canEdit: false,
        isAdmin: false,
        role: null,
      });
      setLoading(false);
      return;
    }

    const checkPermissions = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/permissions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email }),
        });

        if (!response.ok) {
          throw new Error('Failed to check permissions');
        }

        const result = await response.json();
        setPermissions(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setPermissions({
          isAllowed: false,
          canEdit: false,
          isAdmin: false,
          role: null,
        });
      } finally {
        setLoading(false);
      }
    };

    checkPermissions();
  }, [email]);

  return { ...permissions, loading, error };
}
