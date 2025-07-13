import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Aggressive bundle size optimization
    chunkSizeWarningLimit: 500, // Stricter warning limit
    
    rollupOptions: {
      ...((mode === 'production') && {
        external: (id) => {
          // Keep internal but optimize for lazy loading
          return false;
        }
      }),
      output: {
        // Optimize asset names for better caching
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'popup-sdk') {
            return 'popup-sdk.[hash].js'; // Critical popup code
          }
          return 'assets/[name].[hash].js';
        },
        
        chunkFileNames: (chunkInfo) => {
          if (chunkInfo.name?.includes('admin')) {
            return 'admin/[name].[hash].js'; // Admin chunks in separate folder
          }
          return 'assets/[name].[hash].js';
        },
        
        manualChunks: {
          // Minimal customer-facing popup SDK
          'popup-sdk': [
            './src/popup-sdk/index.ts',
            './src/components/PopupManager.tsx',
            './src/components/PopupSDK.tsx'
          ],
          
          // Core React chunks (customer-facing)
          'react-core': ['react', 'react-dom'],
          
          // Admin dashboard chunks (lazy loaded)
          'admin-dashboard': [
            './src/pages/Dashboard.tsx',
            './src/components/analytics/AdvancedAnalytics.tsx',
            './src/components/analytics/ABTestAnalytics.tsx',
            './src/components/analytics/ROIAnalytics.tsx',
            './src/components/analytics/StatisticalInsights.tsx',
            './src/components/analytics/CohortAnalytics.tsx',
            './src/components/analytics/AttributionAnalytics.tsx',
            './src/components/analytics/BehavioralAnalytics.tsx'
          ],
          
          // Heavy analytics dependencies (admin only)
          'analytics-heavy': [
            '@tanstack/react-query',
            'recharts',
            'date-fns'
          ],
          
          // Shopify admin components (admin only)
          'shopify-admin': [
            '@shopify/app-bridge',
            '@shopify/app-bridge-react',
            '@shopify/polaris',
            '@shopify/polaris-icons'
          ],
          
          // UI library chunks (admin only)
          'ui-admin': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-tabs',
            '@radix-ui/react-select',
            '@radix-ui/react-switch',
            '@radix-ui/react-accordion',
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-aspect-ratio',
            '@radix-ui/react-avatar',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-collapsible',
            '@radix-ui/react-context-menu',
            '@radix-ui/react-hover-card',
            '@radix-ui/react-label',
            '@radix-ui/react-menubar',
            '@radix-ui/react-navigation-menu',
            '@radix-ui/react-popover',
            '@radix-ui/react-progress',
            '@radix-ui/react-radio-group',
            '@radix-ui/react-scroll-area',
            '@radix-ui/react-separator',
            '@radix-ui/react-slider',
            '@radix-ui/react-toast',
            '@radix-ui/react-toggle',
            '@radix-ui/react-toggle-group',
            '@radix-ui/react-tooltip'
          ],
          
          // Routing (shared but minimal)
          'router': ['react-router-dom'],
          
          // Essential utilities only
          'utils-minimal': [
            'clsx',
            'tailwind-merge'
          ],
          
          // Performance monitoring (minimal impact)
          'performance': [
            'web-vitals'
          ]
        }
      }
    },
    
    // Enable source maps for production debugging
    sourcemap: mode === 'production' ? false : true,
    
    // Minimize CSS
    cssCodeSplit: true,
    
    // Enable compression
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: mode === 'production',
        drop_debugger: mode === 'production',
      },
    },
  },
  
  // Performance optimizations
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-tabs',
      '@radix-ui/react-select',
      'lucide-react',
      'web-vitals'
    ],
  },
}));
