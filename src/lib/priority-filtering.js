// Priority Filtering Module
// Responsible for filtering and prioritizing content changes based on user preferences

class PriorityFilteringModule {
  constructor(options = {}) {
    this.options = {
      // Default options
      defaultPriorityThreshold: 5, // Minimum priority to show notifications (1-10)
      enableLearning: true, // Whether to learn from user interactions
      siteSpecificSettings: true, // Whether to use site-specific settings
      ...options
    };
    
    this.userPreferences = {
      global: {
        priorityThreshold: this.options.defaultPriorityThreshold,
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
      sites: {} // Site-specific settings
    };
    
    // Learning data
    this.interactionHistory = [];
    this.maxHistoryItems = 100;
  }

  /**
   * Initialize user preferences from storage
   * @param {Object} storedPreferences - User preferences from storage
   */
  initializePreferences(storedPreferences) {
    if (storedPreferences) {
      this.userPreferences = {
        ...this.userPreferences,
        ...storedPreferences
      };
    }
  }

  /**
   * Filter and prioritize content changes
   * @param {Object|Array} changes - Change data object or array of change data objects
   * @param {string} [siteUrl] - Current site URL for site-specific settings
   * @returns {Object|Array|null} - Filtered changes or null if filtered out
   */
  filterChanges(changes, siteUrl = '') {
    // Handle array of changes
    if (Array.isArray(changes)) {
      const filteredChanges = changes
        .map(change => this._filterSingleChange(change, siteUrl))
        .filter(change => change !== null);
      
      return filteredChanges.length > 0 ? filteredChanges : null;
    }
    
    // Handle single change
    return this._filterSingleChange(changes, siteUrl);
  }

  /**
   * Filter a single content change
   * @private
   * @param {Object} change - Change data object
   * @param {string} siteUrl - Current site URL
   * @returns {Object|null} - Filtered change or null if filtered out
   */
  _filterSingleChange(change, siteUrl) {
    // Get applicable preferences
    const preferences = this._getApplicablePreferences(siteUrl);
    
    // Determine content type
    const contentType = this._determineContentType(change);
    
    // Check if content type is enabled
    const typePrefs = preferences.contentTypePreferences[contentType] || 
                      preferences.contentTypePreferences.text; // Default to text preferences
    
    if (!typePrefs.enabled) {
      return null; // Content type is disabled
    }
    
    // Check priority threshold
    const priority = change.priority || 5;
    const threshold = Math.max(typePrefs.minPriority, preferences.priorityThreshold);
    
    if (priority < threshold) {
      return null; // Priority too low
    }
    
    // Apply any additional filtering rules
    if (this._shouldFilterByRules(change, contentType, preferences)) {
      return null;
    }
    
    // Change passed all filters
    return change;
  }

  /**
   * Get applicable preferences for the current site
   * @private
   * @param {string} siteUrl - Current site URL
   * @returns {Object} - Applicable preferences
   */
  _getApplicablePreferences(siteUrl) {
    if (!siteUrl || !this.options.siteSpecificSettings) {
      return this.userPreferences.global;
    }
    
    // Extract domain from URL
    const domain = this._extractDomain(siteUrl);
    
    // Check if we have site-specific settings
    if (this.userPreferences.sites[domain]) {
      // Merge global and site-specific settings
      return {
        ...this.userPreferences.global,
        ...this.userPreferences.sites[domain],
        contentTypePreferences: {
          ...this.userPreferences.global.contentTypePreferences,
          ...(this.userPreferences.sites[domain].contentTypePreferences || {})
        }
      };
    }
    
    return this.userPreferences.global;
  }

  /**
   * Extract domain from URL
   * @private
   * @param {string} url - URL to extract domain from
   * @returns {string} - Domain
   */
  _extractDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch (e) {
      return url; // Return as is if not a valid URL
    }
  }

  /**
   * Determine the content type of a change
   * @private
   * @param {Object} change - Change data object
   * @returns {string} - Content type
   */
  _determineContentType(change) {
    // Check for error messages
    const summary = change.summary || '';
    if (summary.toLowerCase().includes('error') || 
        summary.toLowerCase().includes('warning') ||
        summary.toLowerCase().includes('alert')) {
      return 'error';
    }
    
    // Check context information
    const context = change.original?.context || change.context || {};
    
    if (context.isForm) {
      return 'form';
    }
    
    if (context.role === 'navigation' || 
        context.role === 'link' || 
        context.role === 'button') {
      return 'navigation';
    }
    
    // Check for media content
    if (context.role === 'img' || 
        context.role === 'video' || 
        context.role === 'audio') {
      return 'media';
    }
    
    // Check for chat-like content
    if (summary.includes('message') || 
        context.parentContext?.section?.toLowerCase().includes('chat') ||
        context.parentContext?.section?.toLowerCase().includes('message')) {
      return 'chat';
    }
    
    // Check for advertisements
    if (summary.toLowerCase().includes('ad') || 
        summary.toLowerCase().includes('sponsor') ||
        context.parentContext?.section?.toLowerCase().includes('ad') ||
        context.parentContext?.section?.toLowerCase().includes('sponsor')) {
      return 'advertisement';
    }
    
    // Default to text
    return 'text';
  }

  /**
   * Apply additional filtering rules
   * @private
   * @param {Object} change - Change data object
   * @param {string} contentType - Determined content type
   * @param {Object} preferences - Applicable preferences
   * @returns {boolean} - True if the change should be filtered out
   */
  _shouldFilterByRules(change, contentType, preferences) {
    // Filter out very short content for non-error types
    if (contentType !== 'error' && 
        change.summary && 
        change.summary.length < 3) {
      return true;
    }
    
    // Filter out duplicate content (if similar to recent notifications)
    if (this._isDuplicate(change)) {
      return true;
    }
    
    // Additional rules could be added here
    
    return false;
  }

  /**
   * Check if a change is a duplicate of a recent notification
   * @private
   * @param {Object} change - Change data object
   * @returns {boolean} - True if the change is a duplicate
   */
  _isDuplicate(change) {
    if (!change.summary) {
      return false;
    }
    
    // Check the last few items in interaction history
    const recentItems = this.interactionHistory.slice(-5);
    
    for (const item of recentItems) {
      if (item.summary === change.summary) {
        return true;
      }
      
      // Check for high similarity
      if (this._calculateSimilarity(item.summary, change.summary) > 0.8) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Calculate similarity between two strings
   * @private
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} - Similarity score (0-1)
   */
  _calculateSimilarity(str1, str2) {
    // Simple implementation of string similarity
    // In a real extension, this would use a more sophisticated algorithm
    
    if (str1 === str2) return 1.0;
    if (str1.length === 0 || str2.length === 0) return 0.0;
    
    // Convert to lowercase for case-insensitive comparison
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
    
    // Check if one is a substring of the other
    if (s1.includes(s2) || s2.includes(s1)) {
      const longerLength = Math.max(s1.length, s2.length);
      const shorterLength = Math.min(s1.length, s2.length);
      return shorterLength / longerLength;
    }
    
    // Count matching words
    const words1 = s1.split(/\s+/);
    const words2 = s2.split(/\s+/);
    
    let matchCount = 0;
    for (const word of words1) {
      if (word.length > 3 && words2.includes(word)) {
        matchCount++;
      }
    }
    
    return matchCount / Math.max(words1.length, words2.length);
  }

  /**
   * Record user interaction with a notification
   * @param {Object} change - Change data that was notified
   * @param {string} interaction - Type of interaction (viewed, dismissed, clicked)
   */
  recordInteraction(change, interaction) {
    if (!this.options.enableLearning) {
      return;
    }
    
    // Add to interaction history
    this.interactionHistory.push({
      timestamp: Date.now(),
      summary: change.summary,
      contentType: this._determineContentType(change),
      priority: change.priority,
      interaction: interaction
    });
    
    // Limit history size
    if (this.interactionHistory.length > this.maxHistoryItems) {
      this.interactionHistory.shift();
    }
    
    // Update preferences based on interactions
    this._updatePreferencesFromInteractions();
  }

  /**
   * Update preferences based on user interactions
   * @private
   */
  _updatePreferencesFromInteractions() {
    // This would implement a learning algorithm to adjust preferences
    // based on user interactions. For the prototype, we'll use a simple approach.
    
    // Only update if we have enough data
    if (this.interactionHistory.length < 10) {
      return;
    }
    
    // Get recent interactions
    const recentInteractions = this.interactionHistory.slice(-20);
    
    // Count interactions by content type
    const typeInteractions = {};
    
    for (const item of recentInteractions) {
      if (!typeInteractions[item.contentType]) {
        typeInteractions[item.contentType] = {
          viewed: 0,
          dismissed: 0,
          clicked: 0,
          total: 0
        };
      }
      
      typeInteractions[item.contentType][item.interaction]++;
      typeInteractions[item.contentType].total++;
    }
    
    // Update preferences based on interaction patterns
    for (const [type, counts] of Object.entries(typeInteractions)) {
      if (counts.total < 3) continue; // Skip types with few interactions
      
      const dismissRate = counts.dismissed / counts.total;
      const clickRate = counts.clicked / counts.total;
      
      // If user frequently dismisses a content type, increase its threshold
      if (dismissRate > 0.7) {
        const currentPrefs = this.userPreferences.global.contentTypePreferences[type];
        if (currentPrefs) {
          currentPrefs.minPriority = Math.min(10, currentPrefs.minPriority + 1);
        }
      }
      
      // If user frequently clicks a content type, decrease its threshold
      if (clickRate > 0.3) {
        const currentPrefs = this.userPreferences.global.contentTypePreferences[type];
        if (currentPrefs) {
          currentPrefs.minPriority = Math.max(1, currentPrefs.minPriority - 1);
        }
      }
    }
  }

  /**
   * Update user preferences
   * @param {Object} newPreferences - New user preferences
   * @param {string} [siteUrl] - Site URL for site-specific settings
   */
  updatePreferences(newPreferences, siteUrl = '') {
    if (!siteUrl) {
      // Update global preferences
      this.userPreferences.global = {
        ...this.userPreferences.global,
        ...newPreferences
      };
      
      // Ensure contentTypePreferences is properly merged
      if (newPreferences.contentTypePreferences) {
        this.userPreferences.global.contentTypePreferences = {
          ...this.userPreferences.global.contentTypePreferences,
          ...newPreferences.contentTypePreferences
        };
      }
    } else {
      // Update site-specific preferences
      const domain = this._extractDomain(siteUrl);
      
      if (!this.userPreferences.sites[domain]) {
        this.userPreferences.sites[domain] = {
          contentTypePreferences: {}
        };
      }
      
      this.userPreferences.sites[domain] = {
        ...this.userPreferences.sites[domain],
        ...newPreferences
      };
      
      // Ensure contentTypePreferences is properly merged
      if (newPreferences.contentTypePreferences) {
        this.userPreferences.sites[domain].contentTypePreferences = {
          ...this.userPreferences.sites[domain].contentTypePreferences,
          ...newPreferences.contentTypePreferences
        };
      }
    }
  }

  /**
   * Get current user preferences
   * @param {string} [siteUrl] - Site URL for site-specific settings
   * @returns {Object} - Current preferences
   */
  getPreferences(siteUrl = '') {
    return this._getApplicablePreferences(siteUrl);
  }

  /**
   * Save preferences to storage
   * @returns {Object} - Preferences to save
   */
  getPreferencesForStorage() {
    return this.userPreferences;
  }
}

// Export the module
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PriorityFilteringModule;
}
