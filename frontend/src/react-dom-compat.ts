import * as ReactDOM from 'react-dom';
import { createRoot, hydrateRoot } from 'react-dom/client';

// Re-export all named exports from react-dom
export * from 'react-dom';

// Re-export client-specific APIs so they are part of react-dom
export { createRoot, hydrateRoot };

// Create a combined default export
const ReactDOMCompat = {
  ...ReactDOM,
  createRoot,
  hydrateRoot,
};

export default ReactDOMCompat;
