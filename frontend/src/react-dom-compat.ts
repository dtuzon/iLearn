import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { createRoot, hydrateRoot } from 'react-dom/client';

// Custom shim for findDOMNode in React 19
export function findDOMNode(instance: any): any {
  if (!instance) return null;
  if (instance instanceof Element || instance instanceof Text) {
    return instance;
  }
  const fiber = instance._reactInternals || instance._reactInternalFiber;
  if (!fiber) {
    if (typeof instance.nodeType === 'number') {
      return instance;
    }
    return null;
  }

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

  return findCurrentHostFiber(fiber);
}

// Re-export all named exports from react-dom
export * from 'react-dom';

// Re-export client-specific APIs so they are part of react-dom
export { createRoot, hydrateRoot };

// Attach to window so that legacy UMD / Zoom SDK scripts can find them
if (typeof window !== 'undefined') {
  (window as any).React = React;
  (window as any).ReactDOM = {
    ...ReactDOM,
    findDOMNode,
    createRoot,
    hydrateRoot,
  };
  
  // Custom shim for require in the browser to prevent Zoom SDK crashes
  if (!(window as any).require) {
    (window as any).require = (name: string) => {
      if (name === 'react') return React;
      if (name === 'react-dom') return (window as any).ReactDOM;
      throw new Error(`Cannot find module '${name}'`);
    };
  }
}

// Create a combined default export
const ReactDOMCompat = {
  ...ReactDOM,
  createRoot,
  hydrateRoot,
  findDOMNode,
};

export default ReactDOMCompat;
