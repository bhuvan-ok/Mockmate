// Access token lives here (module scope), not in Redux — this lets axios.js
// read/write it without importing the store, which would create a circular
// import (axios -> store -> authSlice -> axios).
let accessToken = null;

export const setAccessToken = (token) => {
  accessToken = token;
};

export const getAccessToken = () => accessToken;

// Same circular-import problem for the "session is dead" signal: axios.js
// discovers this (a refresh-token retry failed) but can't dispatch to Redux
// directly. App.jsx registers the actual handler once, at the top level.
let sessionExpiredHandler = null;

export const registerSessionExpiredHandler = (handler) => {
  sessionExpiredHandler = handler;
};

export const notifySessionExpired = () => {
  sessionExpiredHandler?.();
};
