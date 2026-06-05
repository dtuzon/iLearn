import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Shim for React 19 compatibility with libraries accessing legacy secret internals (like Zoom SDK)
const anyReact = React as any;

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

shimReactObject(anyReact);
shimReactObject(anyReact.default);
if (typeof window !== 'undefined') {
  if (!(window as any).React) {
    (window as any).React = anyReact;
    shimReactObject((window as any).React);
    shimReactObject((window as any).React.default);
  }
}

// Shim for ReactDOM compatibility with legacy library calls to ReactDOM.createRoot
const anyReactDOM = ReactDOM as any;
const shimReactDOMObject = (obj: any) => {
  if (!obj) return;
  try {
    Object.defineProperty(obj, 'createRoot', {
      value: createRoot,
      writable: true,
      configurable: true
    });
  } catch (e) {
    try {
      obj.createRoot = createRoot;
    } catch (err) {}
  }
};

shimReactDOMObject(anyReactDOM);
shimReactDOMObject(anyReactDOM.default);
if (typeof window !== 'undefined') {
  if (!(window as any).ReactDOM) {
    (window as any).ReactDOM = anyReactDOM;
    shimReactDOMObject((window as any).ReactDOM);
    shimReactDOMObject((window as any).ReactDOM.default);
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
