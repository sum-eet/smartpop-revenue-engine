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
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React chunks
          'react-vendor': ['react', 'react-dom'],
          'react-router': ['react-router-dom'],
          
          // UI library chunks
          'ui-vendor': [
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
          
          // Analytics and data visualization
          'analytics-vendor': [
            '@tanstack/react-query',
            'recharts',
            'date-fns'
          ],
          
          // Shopify App Bridge (only loaded when needed)
          'shopify-vendor': [
            '@shopify/app-bridge',
            '@shopify/app-bridge-react'
          ],
          
          // Shopify Polaris (UI components)
          'polaris-vendor': [
            '@shopify/polaris',
            '@shopify/polaris-icons'
          ],
          
          // Icons
          'icons-vendor': ['lucide-react'],
          
          // Utilities
          'utils-vendor': [
            'clsx',
            'tailwind-merge',
            'class-variance-authority',
            'web-vitals'
          ]
        }
      }
    },
    
    // Optimize chunk sizes
    chunkSizeWarningLimit: 1000,
    
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
