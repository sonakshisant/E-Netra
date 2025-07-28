// Background Script - Main entry point for the extension's background script
// Handles extension lifecycle, user preferences, and communication with content scripts

// Initialize extension when installed or updated
chrome.runtime.onInstalled.addListener((details) => {
  console.log('AI-Powered Dynamic Content Interpreter installed or updated');
  
  // Initialize default settings
  initializeDefaultSettings();
  
  // Set up context menu items
  createContextMenuItems();
});

/**
 * Initialize default settings for the extension
 */
function initializeDefaultSettings() {
  // Default preferences
  const defaultPreferences = {
    enabled: true,
    priorityFiltering: {
      defaultPriorityThreshold: 5,
      enableLearning: true,
      siteSpecificSettings: true,
      contentTypePreferences: {
        text: { enabled: true, minPriority: 5 },
        form: { enabled: true, minPriority: 6 },
        error: { enabled: true, minPriority: 3 },
        navigation: { enabled: true, minPriority: 7 },
        media: { enabled: true, minPriority: 8 },
        chat: { enabled: true, minPriority: 4 },
        advertisement: { enabled: false, minPriority: 10 }
      }
    },
    alertSystem: {
      defaultAlertMethod: 'screenreader',
      visualAlertDuration: 5000,
      audioEnabled: true,
      hapticEnabled: false,
      queueAlerts: true,
      maxQueueSize: 10,
      contentTypeAlertMethods: {
        text: 'screenreader',
        form: 'screenreader',
        error: 'combined',
        navigation: 'screenreader',
        media: 'screenreader',
        chat: 'combined',
        advertisement: 'visual'
      }
    }
  };
  
  // Save default preferences to storage
  chrome.storage.sync.get(['preferences'], (result) => {
    if (!result.preferences) {
      chrome.storage.sync.set({ preferences: defaultPreferences });
    }
  });
}

/**
 * Create context menu items for the extension
 */
function createContextMenuItems() {
  // Create a parent menu item
  chrome.contextMenus.create({
    id: 'ai-accessibility-menu',
    title: 'AI Dynamic Content Interpreter',
    contexts: ['all']
  });
  
  // Create child menu items
  chrome.contextMenus.create({
    id: 'toggle-extension',
    parentId: 'ai-accessibility-menu',
    title: 'Enable/Disable Extension',
    contexts: ['all']
  });
  
  chrome.contextMenus.create({
    id: 'open-options',
    parentId: 'ai-accessibility-menu',
    title: 'Open Settings',
    contexts: ['all']
  });
  
  chrome.contextMenus.create({
    id: 'developer-mode',
    parentId: 'ai-accessibility-menu',
    title: 'Developer Mode',
    contexts: ['all']
  });
}

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  switch (info.menuItemId) {
    case 'toggle-extension':
      toggleExtension(tab);
      break;
    case 'open-options':
      chrome.runtime.openOptionsPage();
      break;
    case 'developer-mode':
      toggleDeveloperMode(tab);
      break;
  }
});

/**
 * Toggle the extension on/off for the current tab
 * @param {Object} tab - Current tab
 */
function toggleExtension(tab) {
  chrome.storage.sync.get(['preferences'], (result) => {
    const preferences = result.preferences || {};
    preferences.enabled = !preferences.enabled;
    
    chrome.storage.sync.set({ preferences }, () => {
      // Notify content script of the change
      chrome.tabs.sendMessage(tab.id, {
        type: 'TOGGLE_EXTENSION',
        enabled: preferences.enabled
      });
    });
  });
}

/**
 * Toggle developer mode for the current tab
 * @param {Object} tab - Current tab
 */
function toggleDeveloperMode(tab) {
  chrome.tabs.sendMessage(tab.id, {
    type: 'TOGGLE_DEVELOPER_MODE'
  });
}

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_PREFERENCES') {
    // Return user preferences for the specific domain
    chrome.storage.sync.get(['preferences'], (result) => {
      sendResponse(result.preferences || {});
    });
    return true; // Indicates async response
  }
  
  if (message.type === 'SAVE_PREFERENCES') {
    // Save updated preferences
    chrome.storage.sync.set({ preferences: message.preferences }, () => {
      sendResponse({ success: true });
    });
    return true; // Indicates async response
  }
  
  if (message.type === 'LOG_INTERACTION') {
    // Log user interaction with a notification
    logInteraction(message.data, sender.tab.url);
    sendResponse({ success: true });
    return true;
  }
});

/**
 * Log user interaction with a notification
 * @param {Object} interactionData - Interaction data
 * @param {string} url - URL of the page
 */
function logInteraction(interactionData, url) {
  chrome.storage.sync.get(['preferences'], (result) => {
    const preferences = result.preferences || {};
    
    // Update interaction history
    if (!preferences.interactionHistory) {
      preferences.interactionHistory = [];
    }
    
    // Add new interaction
    preferences.interactionHistory.push({
      ...interactionData,
      url,
      timestamp: Date.now()
    });
    
    // Limit history size
    if (preferences.interactionHistory.length > 100) {
      preferences.interactionHistory.shift();
    }
    
    // Save updated preferences
    chrome.storage.sync.set({ preferences });
  });
}
