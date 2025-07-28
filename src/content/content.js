// Content Script - Main entry point for the extension's content script
// Integrates all modules and handles the main extension functionality

// Import modules
// Note: In a real extension, these would be imported using import statements or require()
// For this prototype, we'll assume they're available in the global scope

document.addEventListener('DOMContentLoaded', () => {
  console.log('AI-Powered Dynamic Content Interpreter initializing...');
  
  // Initialize all modules
  initializeExtension();
});

/**
 * Initialize the extension and all its modules
 */
function initializeExtension() {
  // Create module instances
  const frameworkCompatibility = new FrameworkCompatibilityModule();
  const contentDetection = new ContentDetectionModule();
  const aiSummarization = new AISummarizationModule();
  const priorityFiltering = new PriorityFilteringModule();
  const alertSystem = new AlertSystemModule();
  
  // Initialize framework compatibility first to detect the framework
  frameworkCompatibility.initialize();
  
  // Initialize alert system
  alertSystem.initialize();
  
  // Load user preferences from storage
  chrome.storage.sync.get(['preferences'], (result) => {
    const storedPreferences = result.preferences || {};
    
    // Initialize modules with stored preferences
    priorityFiltering.initializePreferences(storedPreferences.priorityFiltering);
    alertSystem.updatePreferences(storedPreferences.alertSystem);
    
    // Enhance content detection with framework-specific logic
    const enhancedDetector = frameworkCompatibility.enhanceContentDetection(contentDetection);
    
    // Start observing DOM changes
    enhancedDetector.startObserving(document.body);
    
    // Set up event handlers for detected changes
    enhancedDetector.onSignificantChange(async (changes) => {
      try {
        // Process changes through the pipeline
        
        // 1. Summarize changes
        const summarizedChanges = await aiSummarization.summarizeChanges(changes);
        
        // 2. Filter changes based on priority and user preferences
        const filteredChanges = priorityFiltering.filterChanges(
          summarizedChanges, 
          window.location.href
        );
        
        // 3. Show alerts for filtered changes
        if (filteredChanges) {
          if (Array.isArray(filteredChanges)) {
            // Handle multiple changes
            for (const change of filteredChanges) {
              await alertSystem.showAlert({
                summary: change.summary,
                priority: change.priority,
                contentType: priorityFiltering._determineContentType(change),
                original: change.original
              });
            }
          } else {
            // Handle single change
            await alertSystem.showAlert({
              summary: filteredChanges.summary,
              priority: filteredChanges.priority,
              contentType: priorityFiltering._determineContentType(filteredChanges),
              original: filteredChanges.original
            });
          }
        }
      } catch (error) {
        console.error('Error processing changes:', error);
      }
    });
    
    console.log('AI-Powered Dynamic Content Interpreter initialized successfully');
  });
  
  // Listen for messages from the background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'UPDATE_PREFERENCES') {
      // Update module preferences
      priorityFiltering.updatePreferences(message.preferences.priorityFiltering);
      alertSystem.updatePreferences(message.preferences.alertSystem);
      sendResponse({ success: true });
    }
  });
}

/**
 * Clean up resources when the page is unloaded
 */
window.addEventListener('beforeunload', () => {
  // Clean up any resources
  // This would be implemented in a real extension
});
