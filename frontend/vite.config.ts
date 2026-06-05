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

            // Prevent Zoom SDK 6.0.2 WebRTC strategy check from returning undefined
            if (newCode.includes('window.JsMediaSDK_Instance')) {
              newCode = newCode.replace(
                /null\s*===\s*\(([a-zA-Z_$][\w_$]*)\s*=\s*window\.JsMediaSDK_Instance\)\s*\|\|\s*void\s*0\s*===\s*\1\s*\?\s*void\s*0\s*:\s*\1\.util\.evaluateWebRTCStrategy\(e,\s*t,\s*n\)/g,
                '(($&) || { shouldUseWebRTC: true, errNo: 0 })'
              );
              changed = true;
            }

            // Prevent Zoom SDK 6.0.2 WebRTC capability check from crashing by safely wrapping the method definition
            if (newCode.includes('getWebRTCCapability')) {
              newCode = newCode.replace(
                /static getWebRTCCapability\(/g,
                'static getWebRTCCapability(e,t,n){ return this.__internal_getWebRTCCapability(e,t,n) || { shouldUseWebRTC: true, errNo: 0 }; } static __internal_getWebRTCCapability('
              );
              newCode = newCode.replace(
                /key:\s*["']getWebRTCCapability["']\s*,\s*value:\s*function\s*\(/g,
                'key:"getWebRTCCapability",value:function(e,t,n){ return this.__internal_getWebRTCCapability(e,t,n) || { shouldUseWebRTC: true, errNo: 0 }; }},{key:"__internal_getWebRTCCapability",value:function('
              );
              changed = true;
            }
            // Add null checks for ee.current to prevent "Cannot read properties of null (reading 'children')" crashes
            if (newCode.includes('ee.current')) {
              newCode = newCode.replace(/ee\.current\.children/g, '(ee.current ? ee.current.children : [])');
              newCode = newCode.replace(/i\.observe\(ee\.current/g, 'ee.current && i.observe(ee.current');
              changed = true;
            }

            // Prevent <DraggableCore> crash when findDOMNode fails in React 19
            if (newCode.includes('<DraggableCore> not mounted on DragStart!')) {
              newCode = newCode.replace(
                /throw new Error\([^)]+<DraggableCore> not mounted on DragStart![^)]+\)/g,
                'console.warn("DraggableCore prevented crash"); return'
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
          if (source === 'react-dom' || source === 'react-dom/client') {
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
  optimizeDeps: {
    include: ['@zoom/meetingsdk'],
    rolldownOptions: {
      plugins: [
        {
          name: 'zoom-react19-compat-rolldown',
          transform(code, id) {
            const idNormalized = id.replace(/\\/g, '/');
            if (
              idNormalized.includes('@zoom/meetingsdk') || 
              idNormalized.includes('zoomus-websdk') || 
              idNormalized.includes('@zoom_meetingsdk')
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

              // Prevent Zoom SDK 6.0.2 WebRTC strategy check from returning undefined
              if (newCode.includes('window.JsMediaSDK_Instance')) {
                newCode = newCode.replace(
                  /null\s*===\s*\(([a-zA-Z_$][\w_$]*)\s*=\s*window\.JsMediaSDK_Instance\)\s*\|\|\s*void\s*0\s*===\s*\1\s*\?\s*void\s*0\s*:\s*\1\.util\.evaluateWebRTCStrategy\(e,\s*t,\s*n\)/g,
                  '(($&) || { shouldUseWebRTC: true, errNo: 0 })'
                );
                changed = true;
              }

              // Prevent Zoom SDK 6.0.2 WebRTC capability check from crashing by safely wrapping the method definition
              if (newCode.includes('getWebRTCCapability')) {
                newCode = newCode.replace(
                  /static getWebRTCCapability\(/g,
                  'static getWebRTCCapability(e,t,n){ return this.__internal_getWebRTCCapability(e,t,n) || { shouldUseWebRTC: true, errNo: 0 }; } static __internal_getWebRTCCapability('
                );
                newCode = newCode.replace(
                  /key:\s*["']getWebRTCCapability["']\s*,\s*value:\s*function\s*\(/g,
                  'key:"getWebRTCCapability",value:function(e,t,n){ return this.__internal_getWebRTCCapability(e,t,n) || { shouldUseWebRTC: true, errNo: 0 }; }},{key:"__internal_getWebRTCCapability",value:function('
                );
                changed = true;
              }
              // Add null checks for ee.current to prevent "Cannot read properties of null (reading 'children')" crashes
              if (newCode.includes('ee.current')) {
                newCode = newCode.replace(/ee\.current\.children/g, '(ee.current ? ee.current.children : [])');
                newCode = newCode.replace(/i\.observe\(ee\.current/g, 'ee.current && i.observe(ee.current');
                changed = true;
              }

              // Prevent <DraggableCore> crash when findDOMNode fails in React 19
              if (newCode.includes('<DraggableCore> not mounted on DragStart!')) {
                newCode = newCode.replace(
                  /throw new Error\([^)]+<DraggableCore> not mounted on DragStart![^)]+\)/g,
                  'console.warn("DraggableCore prevented crash"); return'
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
            if (source === 'react-dom' || source === 'react-dom/client') {
              if (importer) {
                const importerNormalized = importer.replace(/\\/g, '/');
                if (
                  importerNormalized.includes('node_modules/react-dom') ||
                  importerNormalized.includes('react-dom-compat')
                ) {
                  return null; // Fallback to default resolution
                }
              }
              return path.resolve(__dirname, './src/react-dom-compat.ts');
            }
            return null;
          }
        }
      ]
    }
  }
});
