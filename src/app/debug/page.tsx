// Debug page to show cache performance
"use client";
import { useState } from "react";
import { permissionsCache } from "../../hooks/usePermissionsCache";

export default function DebugPage() {
  const [cacheStatus, setCacheStatus] = useState<Record<string, unknown> | null>(null);

  const updateCacheStatus = () => {
    setCacheStatus(permissionsCache.getCacheStatus());
  };

  const clearCache = () => {
    permissionsCache.clearCache();
    updateCacheStatus();
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">🛠️ Cache Debug Page</h1>
      
      <div className="space-y-4 mb-6">
        <button
          onClick={updateCacheStatus}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          🔄 Update Cache Status
        </button>
        
        <button
          onClick={clearCache}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 ml-2"
        >
          🗑️ Clear Cache
        </button>
      </div>

      <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
        <h2 className="text-lg font-semibold mb-3">📋 Permissions Cache Status</h2>
        
        {cacheStatus ? (
          <pre className="bg-gray-900 text-green-400 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(cacheStatus, null, 2)}
          </pre>
        ) : (
          <p className="text-gray-600">Click "Update Cache Status" to see cache data</p>
        )}
      </div>

      <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
        <h3 className="font-semibold mb-2">📈 How to Test Cache Performance:</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>Open browser dev tools Network tab</li>
          <li>Clear cache using button above</li>
          <li>Navigate to home page - should see 1 permissions API call</li>
          <li>Navigate to different pages - should see NO additional API calls</li>
          <li>Check cache status to see cached data and subscriber counts</li>
        </ol>
      </div>

      <div className="mt-6 bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
        <h3 className="font-semibold mb-2">✅ Expected Improvements:</h3>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>First page load: 1 permissions API call (instead of 6+)</li>
          <li>Subsequent page loads: 0 API calls (cached for 5 minutes)</li>
          <li>Multiple components share same cached data</li>
          <li>Automatic cache invalidation after 5 minutes</li>
        </ul>
      </div>
    </div>
  );
}
