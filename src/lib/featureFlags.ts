/**
 * Feature flags for gradual Polaris migration
 * Set environment variables to enable/disable features
 */

export const featureFlags = {
  // Enable Polaris components (default: false for safety)
  enablePolaris: import.meta.env.VITE_ENABLE_POLARIS === 'true',
  
  // Enable specific component migrations
  enablePolarisButtons: import.meta.env.VITE_ENABLE_POLARIS_BUTTONS === 'true' || import.meta.env.VITE_ENABLE_POLARIS === 'true',
  enablePolarisCards: import.meta.env.VITE_ENABLE_POLARIS_CARDS === 'true' || import.meta.env.VITE_ENABLE_POLARIS === 'true',
  enablePolarisLayout: false, // Temporarily disabled - DashboardPolarisSimple has runtime issues
  
  // Development flags
  enablePolarisDebug: import.meta.env.VITE_POLARIS_DEBUG === 'true',
};

/**
 * Helper to conditionally render Polaris or fallback components
 */
export function withPolarisFlag<T>(
  flag: boolean,
  polarisComponent: T,
  fallbackComponent: T
): T {
  return flag ? polarisComponent : fallbackComponent;
}

/**
 * Log feature flag status (development only)
 */
if (import.meta.env.DEV && featureFlags.enablePolarisDebug) {
  console.log('🎨 Polaris Feature Flags:', featureFlags);
}