import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { flushSync } from 'react-dom';
import { createRoot, hydrateRoot } from 'react-dom/client';

if (typeof window !== 'undefined') {
  (window as any).__my_logs = (window as any).__my_logs || [];
  const originalWarn = console.warn;
  console.warn = (...args) => {
    try {
      (window as any).__my_logs.push('[WARN] ' + args.map(a => {
        if (!a) return String(a);
        if (a instanceof Error) return a.message + '\n' + a.stack;
        if (typeof a === 'object') return '[Object]';
        return String(a);
      }).join(' '));
    } catch (e) {}
    originalWarn.apply(console, args);
  };
  const originalError = console.error;
  console.error = (...args) => {
    try {
      (window as any).__my_logs.push('[ERROR] ' + args.map(a => {
        if (!a) return String(a);
        if (a instanceof Error) return a.message + '\n' + a.stack;
        if (typeof a === 'object') return '[Object]';
        return String(a);
      }).join(' '));
    } catch (e) {}
    originalError.apply(console, args);
  };

  window.onerror = function(message, _source, _lineno, _colno, error) {
    const errorStr = error ? (error.message + '\n' + error.stack) : String(message);
    (window as any).__my_logs.push('[WINDOW ERROR] ' + errorStr);
  };

  window.addEventListener('unhandledrejection', function(event) {
    const error = event.reason;
    const errorStr = error ? (error.message + '\n' + error.stack) : String(error);
    (window as any).__my_logs.push('[UNHANDLED REJECTION] ' + errorStr);
  });
}

// Custom shim for findDOMNode in React 19
export function findDOMNode(instance: any): any {
  if (!instance) return null;
  if (instance instanceof Element || instance instanceof Text) {
    return instance;
  }
  
  // Try to find the fiber from the instance directly by scanning properties and symbols
  let fiber = instance._reactInternals || instance._reactInternalFiber;
  if (!fiber) {
    const keys = [
      ...Object.getOwnPropertyNames(instance),
      ...Object.getOwnPropertySymbols(instance)
    ];
    for (const key of keys) {
      try {
        const val = instance[key];
        if (val && typeof val === 'object' && val.stateNode === instance && 'return' in val) {
          fiber = val;
          break;
        }
      } catch (e) {}
    }
  }

  if (fiber) {
    function findCurrentHostFiber(node: any): any {
      if (!node) return null;
      if (node.stateNode instanceof Element || node.stateNode instanceof Text) {
        return node.stateNode;
      }
      let child = node.child;
      while (child) {
        const match = findCurrentHostFiber(child);
        if (match) return match;
        child = child.sibling;
      }
      return null;
    }
    const found = findCurrentHostFiber(fiber);
    if (found) {
      return found;
    }
  }

  // Fallback for React 19: Search the DOM tree for a matching element
  if (typeof document !== 'undefined') {
    const zoomContainer = document.getElementById('zoom-sdk-container');
    const elementsToSearch = zoomContainer ? zoomContainer.getElementsByTagName('*') : document.getElementsByTagName('*');
    
    for (let i = 0; i < elementsToSearch.length; i++) {
      const el = elementsToSearch[i] as any;
      const keys = Object.keys(el);
      for (let j = 0; j < keys.length; j++) {
        const key = keys[j];
        if (key.startsWith('__reactFiber$') || key.startsWith('__reactInternalInstance$')) {
          let f = el[key];
          while (f) {
            if (f.stateNode === instance) {
              return el;
            }
            f = f.return;
          }
        }
      }
    }

    // Secondary fallback: if zoomContainer search was active and failed, search the full document
    if (zoomContainer) {
      const allElements = document.getElementsByTagName('*');
      for (let i = 0; i < allElements.length; i++) {
        const el = allElements[i] as any;
        const keys = Object.keys(el);
        for (let j = 0; j < keys.length; j++) {
          const key = keys[j];
          if (key.startsWith('__reactFiber$') || key.startsWith('__reactInternalInstance$')) {
            let f = el[key];
            while (f) {
              if (f.stateNode === instance) {
                return el;
              }
              f = f.return;
            }
          }
        }
      }
    }
  }

  // Last resort fallback
  if (typeof instance.nodeType === 'number') {
    return instance;
  }
  return null;
}

// Custom shim for ReactDOM.render in React 19
export function render(element: any, container: any, callback?: any): any {
  if (!container) return null;
  let root = container._reactRoot;
  if (!root) {
    root = createRoot(container);
    container._reactRoot = root;
  }
  flushSync(() => {
    root.render(element);
  });
  if (callback) {
    callback();
  }
  return null;
}

// Custom shim for ReactDOM.unmountComponentAtNode in React 19
export function unmountComponentAtNode(container: any): boolean {
  if (!container) return false;
  if (container._reactRoot) {
    try {
      container._reactRoot.unmount();
    } catch (e) {
      // Ignore unmount errors
    }
    delete container._reactRoot;
    return true;
  }
  return false;
}

// Explicitly re-export standard react-dom named exports to avoid Vite "export *" interop failures
export { createPortal, unstable_batchedUpdates, version } from 'react-dom';
export { flushSync };

// Re-export client-specific APIs so they are part of react-dom
export { createRoot, hydrateRoot };

// Helper to shim React 19 internals for legacy libraries
const shimReactObject = (obj: any) => {
  if (!obj) return;
  const originalInternals =
    obj.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE ||
    obj.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;

  const customInternals = new Proxy(originalInternals || {}, {
    get(target, prop, receiver) {
      if (prop === 'ReactCurrentOwner') {
        return target.ReactCurrentOwner || { current: null };
      }
      if (prop === 'ReactCurrentBatchConfig') {
        return target.ReactCurrentBatchConfig || { transition: 0 };
      }
      return Reflect.get(target, prop, receiver);
    }
  });

  try {
    Object.defineProperty(obj, '__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED', {
      value: customInternals,
      writable: true,
      configurable: true
    });
  } catch (e) {
    try {
      obj.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = customInternals;
    } catch (err) {}
  }

  try {
    Object.defineProperty(obj, '__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE', {
      value: customInternals,
      writable: true,
      configurable: true
    });
  } catch (e) {
    try {
      obj.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = customInternals;
    } catch (err) {}
  }
};

// Attach to window so that legacy UMD / Zoom SDK scripts can find them
if (typeof window !== 'undefined') {
  const anyReact = React as any;
  shimReactObject(anyReact);
  shimReactObject(anyReact.default);
  
  (window as any).React = anyReact;
  (window as any).ReactDOM = {
    ...ReactDOM,
    findDOMNode,
    createRoot,
    hydrateRoot,
    render,
    unmountComponentAtNode,
  };
  
  // Custom shim for require in the browser to prevent Zoom SDK crashes.
  // Returns known modules; silently returns null for unknown ones (SDK probes optional modules).
  if (!(window as any).require) {
    (window as any).require = (name: string) => {
      if (name === 'react') return (window as any).React;
      if (name === 'react-dom') return (window as any).ReactDOM;
      // Return null for unknown modules (e.g. 'disk-file-writer') — SDK handles missing optionals
      return null;
    };
  }
}

// Create a combined default export
const ReactDOMCompat = {
  ...ReactDOM,
  createRoot,
  hydrateRoot,
  findDOMNode,
  render,
  unmountComponentAtNode,
};

export default ReactDOMCompat;
