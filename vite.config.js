import { defineConfig } from 'vite';
export default defineConfig({
  base: './',
  define: {
    __VUE_OPTIONS_API__: true,
    __VUE_PROD_DEVTOOLS__: false,
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1200,
    rolldownOptions: {
      output: {
        codeSplitting: true,
        manualChunks(id) {
          if (id.includes('node_modules/react/')) return 'vendor-react';
          if (id.includes('node_modules/react-dom/')) return 'vendor-react-dom';
          if (id.includes('node_modules/lucide-react/')) return 'vendor-lucide';
          if (id.includes('node_modules/superdoc/')) return 'vendor-superdoc';
          if (id.includes('node_modules/')) return 'vendor-misc';
          return null;
        },
      },
    },
  },
});
