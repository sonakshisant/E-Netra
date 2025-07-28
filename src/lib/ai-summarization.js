// AI Summarization Module
// Responsible for interpreting and summarizing dynamic content changes

class AISummarizationModule {
  constructor(options = {}) {
    this.options = {
      // Default options
      maxSummaryLength: 150,
      minContentLength: 20,
      preserveContext: true,
      localProcessingOnly: false,
      ...options
    };
    
    this.contextHistory = [];
    this.maxContextItems = 5;
  }

  /**
   * Process and summarize content changes
   * @param {Object|Array} changeData - Change data object or array of change data objects
   * @returns {Promise<Object>} - Processed summary data
   */
  async summarizeChanges(changeData) {
    // Handle array of changes
    if (Array.isArray(changeData)) {
      // If multiple changes, process them as a batch
      return this._processBatchChanges(changeData);
    }
    
    // Process single change
    return this._processSingleChange(changeData);
  }

  /**
   * Process a single content change
   * @private
   * @param {Object} changeData - Change data object
   * @returns {Promise<Object>} - Processed summary data
   */
  async _processSingleChange(changeData) {
    // Extract relevant text from the change
    const relevantText = this._extractRelevantText(changeData);
    
    // If text is too short, use it directly without summarization
    if (relevantText.length < this.options.minContentLength) {
      return this._createDirectSummary(changeData, relevantText);
    }
    
    try {
      // Generate summary based on the change type and content
      const summary = await this._generateSummary(changeData, relevantText);
      
      // Update context history for future summarizations
      if (this.options.preserveContext) {
        this._updateContextHistory(changeData, summary);
      }
      
      return {
        original: changeData,
        summary: summary,
        priority: this._determinePriority(changeData, summary),
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error generating summary:', error);
      // Fallback to simple extraction if summarization fails
      return this._createDirectSummary(changeData, relevantText);
    }
  }

  /**
   * Process multiple content changes as a batch
   * @private
   * @param {Array} changes - Array of change data objects
   * @returns {Promise<Object>} - Processed summary data
   */
  async _processBatchChanges(changes) {
    // Group related changes
    const groupedChanges = this._groupRelatedChanges(changes);
    
    // Process each group
    const processedGroups = await Promise.all(
      groupedChanges.map(group => this._summarizeChangeGroup(group))
    );
    
    // Combine and prioritize results
    return this._combineGroupResults(processedGroups);
  }

  /**
   * Group related changes together
   * @private
   * @param {Array} changes - Array of change data objects
   * @returns {Array} - Array of grouped change data objects
   */
  _groupRelatedChanges(changes) {
    // Group by parent element or proximity in the DOM
    const groups = [];
    const assignedChanges = new Set();
    
    // First pass: group by exact same target
    const targetGroups = new Map();
    
    for (const change of changes) {
      const target = change.element;
      if (!targetGroups.has(target)) {
        targetGroups.set(target, []);
      }
      targetGroups.get(target).push(change);
      assignedChanges.add(change);
    }
    
    // Add target groups to result
    for (const group of targetGroups.values()) {
      if (group.length > 0) {
        groups.push(group);
      }
    }
    
    // Second pass: group by parent context
    const contextGroups = new Map();
    
    for (const change of changes) {
      if (assignedChanges.has(change)) continue;
      
      const contextKey = `${change.context.parentContext.heading}|${change.context.parentContext.section}`;
      if (!contextGroups.has(contextKey)) {
        contextGroups.set(contextKey, []);
      }
      contextGroups.get(contextKey).push(change);
      assignedChanges.add(change);
    }
    
    // Add context groups to result
    for (const group of contextGroups.values()) {
      if (group.length > 0) {
        groups.push(group);
      }
    }
    
    // Add any remaining changes as individual groups
    for (const change of changes) {
      if (!assignedChanges.has(change)) {
        groups.push([change]);
      }
    }
    
    return groups;
  }

  /**
   * Summarize a group of related changes
   * @private
   * @param {Array} changeGroup - Group of related change data objects
   * @returns {Promise<Object>} - Processed summary data for the group
   */
  async _summarizeChangeGroup(changeGroup) {
    if (changeGroup.length === 1) {
      // If only one change in the group, process it normally
      return this._processSingleChange(changeGroup[0]);
    }
    
    // Combine relevant text from all changes
    let combinedText = '';
    let combinedContext = null;
    
    for (const change of changeGroup) {
      const text = this._extractRelevantText(change);
      if (text) {
        combinedText += text + ' ';
      }
      
      // Use the context of the first change as the group context
      if (!combinedContext) {
        combinedContext = change.context;
      }
    }
    
    combinedText = combinedText.trim();
    
    // Create a synthetic change data object for the group
    const groupChangeData = {
      type: 'group',
      content: {
        text: combinedText,
        html: '',
        old: '',
        new: combinedText
      },
      element: changeGroup[0].element,
      timestamp: Date.now(),
      context: combinedContext,
      changes: changeGroup
    };
    
    // Process the combined change
    return this._processSingleChange(groupChangeData);
  }

  /**
   * Combine and prioritize results from multiple change groups
   * @private
   * @param {Array} processedGroups - Array of processed summary data objects
   * @returns {Object} - Combined summary data
   */
  _combineGroupResults(processedGroups) {
    // Sort by priority
    processedGroups.sort((a, b) => b.priority - a.priority);
    
    // Take the highest priority result as the main summary
    const mainResult = processedGroups[0];
    
    // Include information about other changes
    if (processedGroups.length > 1) {
      const otherChangesCount = processedGroups.length - 1;
      const otherChangesSummary = processedGroups
        .slice(1, 3) // Take up to 2 additional summaries
        .map(group => group.summary)
        .join('. ');
      
      const additionalInfo = otherChangesCount > 2 
        ? ` Plus ${otherChangesCount - 2} more changes.`
        : '';
      
      mainResult.summary += `. ${otherChangesSummary}${additionalInfo}`;
    }
    
    // Include all original changes
    mainResult.allChanges = processedGroups.flatMap(group => 
      group.original.changes || [group.original]
    );
    
    return mainResult;
  }

  /**
   * Extract relevant text from a change
   * @private
   * @param {Object} changeData - Change data object
   * @returns {string} - Relevant text from the change
   */
  _extractRelevantText(changeData) {
    const content = changeData.content;
    
    // Prefer new content over general text content
    if (content.new && content.new.length > 0) {
      return content.new;
    }
    
    if (content.text && content.text.length > 0) {
      return content.text;
    }
    
    return '';
  }

  /**
   * Create a direct summary without AI processing
   * @private
   * @param {Object} changeData - Change data object
   * @param {string} text - Relevant text from the change
   * @returns {Object} - Simple summary data
   */
  _createDirectSummary(changeData, text) {
    // Create a simple description based on the change type and context
    let summary = text;
    
    // Add context information if available
    if (changeData.context) {
      const context = changeData.context;
      
      // Add role information
      if (context.role) {
        const roleMap = {
          button: 'Button',
          link: 'Link',
          checkbox: 'Checkbox',
          radio: 'Radio button',
          textbox: 'Text field',
          combobox: 'Dropdown',
          heading: 'Heading'
        };
        
        const roleName = roleMap[context.role] || context.role;
        
        // For interactive elements, describe the action
        if (context.isInteractive) {
          switch (changeData.type) {
            case 'addition':
              summary = `${roleName} added: ${text}`;
              break;
            case 'removal':
              summary = `${roleName} removed`;
              break;
            case 'text':
              summary = `${roleName} updated to: ${text}`;
              break;
            case 'attribute':
              summary = `${roleName} state changed: ${text}`;
              break;
            default:
              summary = `${roleName}: ${text}`;
          }
        }
      }
      
      // For form elements, add more specific context
      if (context.isForm) {
        const label = context.label;
        if (label) {
          summary = `Form field "${label}" updated to: ${text}`;
        }
      }
      
      // For live regions, prioritize the content directly
      if (context.isLiveRegion) {
        summary = text;
      }
    }
    
    return {
      original: changeData,
      summary: summary,
      priority: this._determinePriority(changeData, summary),
      timestamp: Date.now(),
      isDirectSummary: true
    };
  }

  /**
   * Generate an AI-powered summary of the content change
   * @private
   * @param {Object} changeData - Change data object
   * @param {string} text - Relevant text from the change
   * @returns {Promise<string>} - Generated summary
   */
  async _generateSummary(changeData, text) {
    // If local processing only is enabled, use rule-based summarization
    if (this.options.localProcessingOnly) {
      return this._generateLocalSummary(changeData, text);
    }
    
    // Get context for the summarization
    const context = this._buildSummarizationContext(changeData);
    
    // In a real implementation, this would call an AI service
    // For this prototype, we'll use a simulated AI response
    return this._simulateAISummarization(text, context, changeData);
  }

  /**
   * Generate a summary using local rule-based processing
   * @private
   * @param {Object} changeData - Change data object
   * @param {string} text - Relevant text from the change
   * @returns {string} - Generated summary
   */
  _generateLocalSummary(changeData, text) {
    // Implement rule-based summarization
    // This is a simplified version that would be expanded in a real implementation
    
    // Truncate long text
    if (text.length > this.options.maxSummaryLength) {
      return text.substring(0, this.options.maxSummaryLength - 3) + '...';
    }
    
    // For shorter text, use it directly with context
    const context = changeData.context;
    let summary = text;
    
    // Add context based on change type
    switch (changeData.type) {
      case 'addition':
        if (context.role === 'heading') {
          summary = `New section: ${text}`;
        } else if (context.isInteractive) {
          summary = `New ${context.role || 'element'} added: ${text}`;
        } else {
          summary = `New content: ${text}`;
        }
        break;
        
      case 'removal':
        summary = `Content removed: ${text}`;
        break;
        
      case 'text':
        if (context.isForm) {
          summary = `Form updated: ${text}`;
        } else if (context.isLiveRegion) {
          summary = text; // Use the text directly for live regions
        } else {
          summary = `Updated: ${text}`;
        }
        break;
        
      case 'attribute':
        if (text.startsWith('aria-')) {
          summary = `Accessibility state changed: ${text}`;
        } else {
          summary = `Element state changed: ${text}`;
        }
        break;
        
      case 'group':
        summary = `Multiple updates: ${text}`;
        break;
    }
    
    return summary;
  }

  /**
   * Build context information for summarization
   * @private
   * @param {Object} changeData - Change data object
   * @returns {Object} - Context information for summarization
   */
  _buildSummarizationContext(changeData) {
    return {
      changeType: changeData.type,
      elementRole: changeData.context?.role || '',
      elementLabel: changeData.context?.label || '',
      isInteractive: changeData.context?.isInteractive || false,
      isForm: changeData.context?.isForm || false,
      isLiveRegion: changeData.context?.isLiveRegion || false,
      parentHeading: changeData.context?.parentContext?.heading || '',
      parentSection: changeData.context?.parentContext?.section || '',
      previousContext: this.contextHistory.slice(-2)
    };
  }

  /**
   * Simulate AI summarization (for prototype purposes)
   * @private
   * @param {string} text - Text to summarize
   * @param {Object} context - Context information
   * @param {Object} changeData - Original change data
   * @returns {Promise<string>} - Simulated AI summary
   */
  async _simulateAISummarization(text, context, changeData) {
    // This is a simulation of AI summarization for the prototype
    // In a real implementation, this would call an actual AI service
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Simple text truncation for very long content
    if (text.length > this.options.maxSummaryLength * 2) {
      text = text.substring(0, this.options.maxSummaryLength * 2);
    }
    
    // Generate different summaries based on context
    let summary = '';
    
    // Handle different change types
    switch (changeData.type) {
      case 'addition':
        if (context.isLiveRegion) {
          // For live regions, use the content directly
          summary = text;
        } else if (context.elementRole === 'heading') {
          summary = `New section: ${text}`;
        } else if (context.isForm) {
          summary = `New form field added: ${context.elementLabel || text}`;
        } else if (context.isInteractive) {
          summary = `New ${context.elementRole || 'interactive element'} added: ${text}`;
        } else if (text.includes('error') || text.includes('Error') || text.includes('failed')) {
          summary = `Error message: ${text}`;
        } else if (text.length > 100) {
          // For longer additions, create a more concise summary
          summary = `New content added: ${text.substring(0, 100)}...`;
        } else {
          summary = `New content: ${text}`;
        }
        break;
        
      case 'removal':
        if (context.isInteractive) {
          summary = `${context.elementRole || 'Element'} removed`;
        } else {
          summary = 'Content removed';
        }
        break;
        
      case 'text':
        if (context.isForm) {
          const label = context.elementLabel ? `"${context.elementLabel}"` : '';
          summary = `Form field ${label} updated to: ${text}`;
        } else if (context.isLiveRegion) {
          // For live regions, prioritize the content directly
          summary = text;
        } else if (text.includes('error') || text.includes('Error') || text.includes('failed')) {
          summary = `Error message: ${text}`;
        } else {
          summary = `Updated content: ${text}`;
        }
        break;
        
      case 'attribute':
        if (text.startsWith('aria-')) {
          summary = `Accessibility state changed: ${text}`;
        } else {
          summary = `Element state changed: ${text}`;
        }
        break;
        
      case 'group':
        summary = `Multiple updates: ${text.substring(0, this.options.maxSummaryLength)}`;
        break;
        
      default:
        summary = text;
    }
    
    // Ensure the summary isn't too long
    if (summary.length > this.options.maxSummaryLength) {
      summary = summary.substring(0, this.options.maxSummaryLength - 3) + '...';
    }
    
    return summary;
  }

  /**
   * Determine the priority of a change
   * @private
   * @param {Object} changeData - Change data object
   * @param {string} summary - Generated summary
   * @returns {number} - Priority level (1-10, with 10 being highest)
   */
  _determinePriority(changeData, summary) {
    let priority = 5; // Default medium priority
    
    // Increase priority for certain conditions
    if (changeData.context) {
      // Live regions are high priority
      if (changeData.context.isLiveRegion) {
        priority += 3;
      }
      
      // Interactive elements are higher priority
      if (changeData.context.isInteractive) {
        priority += 1;
      }
      
      // Form elements with errors are high priority
      if (changeData.context.isForm && 
          (summary.includes('error') || summary.includes('Error'))) {
        priority += 3;
      }
      
      // Headings are higher priority
      if (changeData.context.role === 'heading') {
        priority += 2;
      }
    }
    
    // Content-based priority adjustments
    if (summary.includes('error') || summary.includes('Error') || 
        summary.includes('alert') || summary.includes('Alert') ||
        summary.includes('warning') || summary.includes('Warning')) {
      priority += 2;
    }
    
    // Adjust based on change type
    switch (changeData.type) {
      case 'addition':
        priority += 1; // New content is slightly higher priority
        break;
      case 'removal':
        priority -= 1; // Removals are slightly lower priority
        break;
      case 'group':
        priority += 1; // Groups of changes are slightly higher priority
        break;
    }
    
    // Ensure priority is within bounds
    return Math.max(1, Math.min(10, priority));
  }

  /**
   * Update context history for future summarizations
   * @private
   * @param {Object} changeData - Change data object
   * @param {string} summary - Generated summary
   */
  _updateContextHistory(changeData, summary) {
    // Add to context history
    this.contextHistory.push({
      timestamp: Date.now(),
      summary: summary,
      changeType: changeData.type,
      elementRole: changeData.context?.role || '',
      elementLabel: changeData.context?.label || ''
    });
    
    // Limit history size
    if (this.contextHistory.length > this.maxContextItems) {
      this.contextHistory.shift();
    }
  }
}

// Export the module
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AISummarizationModule;
}
