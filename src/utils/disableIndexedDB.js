// This file temporarily disables IndexedDB to prevent errors
console.log('Disabling IndexedDB temporarily to prevent console errors');

const originalIndexedDB = window.indexedDB;

// Create a dummy IndexedDB that just logs errors but doesn't fail
window.indexedDB = {
  open: function() {
    console.log('IndexedDB access attempted but disabled');
    return {
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null,
      result: null
    };
  }
};

// Add this to window for debugging
window.__enableIndexedDB = function() {
  window.indexedDB = originalIndexedDB;
  console.log('IndexedDB re-enabled');
};