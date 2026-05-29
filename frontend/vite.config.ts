import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Required by @zoom/meetingsdk — allows WebAssembly evaluation
    {
      name: 'zoom-sdk-headers',
      configureServer(server) {
        server.middlewares.use((_req, res, next) => {
          res.setHeader(
            'Content-Security-Policy',
            [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' blob: https://*.zoom.us https://zoom.us https://*.zoomdev.us https://zoomdev.us",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com data:",
              "img-src 'self' data: blob: https: https://*.zoom.us https://zoom.us",
              "media-src 'self' blob: https:",
              "connect-src 'self' https://*.zoom.us https://zoom.us wss://*.zoom.us wss://zoom.us https://*.zoomdev.us https://zoomdev.us wss://*.zoomdev.us wss://zoomdev.us https://*.cloudfront.net",
              "worker-src 'self' blob:",
              "frame-src 'self' https://*.zoom.us https://zoom.us",
              ].join('; ')
            );
            // Required for SharedArrayBuffer (used by Zoom audio processing)
            res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
            res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
            next();
          });
        },
      },
      // Rewrite legacy React internals to React 19 equivalents during file serving
      // Rewrite legacy React internals to React 19 equivalents during file serving
      {
        name: 'zoom-react19-compat',
        transform(code, id) {
          if (
            id.includes('@zoom/meetingsdk') || 
            id.includes('zoomus-websdk') || 
            id.includes('@zoom_meetingsdk')
          ) {
            let changed = false;
            let newCode = code;

            if (newCode.includes('__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED')) {
              newCode = newCode.replace(
                /__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED/g,
                '__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE'
              );
              changed = true;
            }

            if (newCode.includes('react.element')) {
              newCode = newCode.replace(
                /['"]react\.element['"]/g,
                '"react.transitional.element"'
              );
              changed = true;
            }

            if (changed) {
              return {
                code: newCode,
                map: null
              };
            }
          }
          return null;
        }
      },
      {
        name: 'react-dom-compat-alias',
        enforce: 'pre',
        resolveId(source, importer, options) {
          if (source === 'react-dom') {
            if (importer && (importer.replace(/\\/g, '/').includes('node_modules/react-dom') || importer.includes('react-dom-compat'))) {
              return this.resolve(source, importer, Object.assign({ skipSelf: true }, options));
            }
            return path.resolve(__dirname, "./src/react-dom-compat.ts");
          }
        }
      }
    ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
    },
  },
  // Ensure @zoom/meetingsdk is pre-bundled by Vite to resolve CommonJS require/module issues
  optimizeDeps: {
    include: ['@zoom/meetingsdk'],
    rolldownOptions: {
      plugins: [
        {
          name: 'zoom-react19-compat-rolldown',
          transform(code, id) {
            if (
              id.includes('@zoom/meetingsdk') || 
              id.includes('zoomus-websdk') || 
              id.includes('@zoom_meetingsdk')
            ) {
              let changed = false;
              let newCode = code;

              if (newCode.includes('__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED')) {
                newCode = newCode.replace(
                  /__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED/g,
                  '__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE'
                );
                changed = true;
              }

              if (newCode.includes('react.element')) {
                newCode = newCode.replace(
                  /['"]react\.element['"]/g,
                  '"react.transitional.element"'
                );
                changed = true;
              }

              if (changed) {
                return {
                  code: newCode,
                  map: null
                };
              }
            }
            return null;
          }
        },
        {
          name: 'react-dom-compat-rolldown',
          resolveId(source, importer) {
            if (source === 'react-dom') {
              if (importer && (importer.replace(/\\/g, '/').includes('node_modules/react-dom') || importer.includes('react-dom-compat'))) {
                return null; // Fallback to default resolution
              }
              return path.resolve(__dirname, './src/react-dom-compat.ts');
            }
            return null;
          }
        }
      ]
    }
  },
});
