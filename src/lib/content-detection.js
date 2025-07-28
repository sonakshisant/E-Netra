// Content Detection Module
// Responsible for monitoring and analyzing DOM changes to identify significant dynamic content updates

class ContentDetectionModule {
  constructor(options = {}) {
    this.options = {
      // Default options
      throttleTime: 100, // ms to throttle high-frequency updates
      minTextLength: 5, // minimum text length to consider significant
      ignoredTags: ['SCRIPT', 'STYLE', 'NOSCRIPT', 'META', 'LINK'],
      ignoredClasses: ['hidden', 'visually-hidden', 'sr-only'],
      ...options
    };
    
    this.observer = null;
    this.changeListeners = [];
    this.lastProcessedTime = 0;
    this.pendingChanges = [];
    this.isProcessing = false;
  }

  /**
   * Start observing DOM mutations on the target element
   * @param {Element} target - The DOM element to observe (usually document.body)
   */
  startObserving(target) {
    if (!target) {
      console.error('No target element provided for observation');
      return;
    }

    // Create a new MutationObserver
    this.observer = new MutationObserver(this._handleMutations.bind(this));
    
    // Configure and start the observer
    this.observer.observe(target, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
      attributeOldValue: true,
      characterDataOldValue: true
    });
    
    console.log('DOM observation started');
  }

  /**
   * Stop observing DOM mutations
   */
  stopObserving() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
      console.log('DOM observation stopped');
    }
  }

  /**
   * Register a callback for significant content changes
   * @param {Function} callback - Function to call when significant changes are detected
   */
  onSignificantChange(callback) {
    if (typeof callback === 'function') {
      this.changeListeners.push(callback);
    }
  }

  /**
   * Handle mutation records from the observer
   * @private
   * @param {MutationRecord[]} mutations - Array of mutation records
   */
  _handleMutations(mutations) {
    // Throttle processing for high-frequency updates
    const now = Date.now();
    if (now - this.lastProcessedTime < this.options.throttleTime) {
      // Add to pending changes and schedule processing
      this.pendingChanges = this.pendingChanges.concat(mutations);
      
      if (!this.isProcessing) {
        setTimeout(() => this._processPendingChanges(), this.options.throttleTime);
        this.isProcessing = true;
      }
      return;
    }
    
    this.lastProcessedTime = now;
    this._processMutations(mutations);
  }

  /**
   * Process pending mutation records
   * @private
   */
  _processPendingChanges() {
    if (this.pendingChanges.length > 0) {
      this._processMutations(this.pendingChanges);
      this.pendingChanges = [];
    }
    this.isProcessing = false;
  }

  /**
   * Process mutation records to identify significant changes
   * @private
   * @param {MutationRecord[]} mutations - Array of mutation records
   */
  _processMutations(mutations) {
    // Group related mutations
    const groupedChanges = this._groupRelatedMutations(mutations);
    
    // Analyze each group for significance
    const significantChanges = groupedChanges
      .map(group => this._analyzeChangeGroup(group))
      .filter(change => change !== null);
    
    // Notify listeners of significant changes
    if (significantChanges.length > 0) {
      this._notifyChangeListeners(significantChanges);
    }
  }

  /**
   * Group related mutations together
   * @private
   * @param {MutationRecord[]} mutations - Array of mutation records
   * @returns {Array} - Array of grouped mutation records
   */
  _groupRelatedMutations(mutations) {
    // Simple grouping by target node for now
    // This could be enhanced with more sophisticated grouping logic
    const groups = new Map();
    
    for (const mutation of mutations) {
      const key = mutation.target;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key).push(mutation);
    }
    
    return Array.from(groups.values());
  }

  /**
   * Analyze a group of related mutations to determine if they represent a significant change
   * @private
   * @param {MutationRecord[]} mutationGroup - Group of related mutation records
   * @returns {Object|null} - Change data object or null if not significant
   */
  _analyzeChangeGroup(mutationGroup) {
    if (!mutationGroup || mutationGroup.length === 0) {
      return null;
    }
    
    // Extract the target element from the first mutation
    const target = mutationGroup[0].target;
    
    // Skip ignored elements
    if (this._shouldIgnoreElement(target)) {
      return null;
    }
    
    // Categorize the change type
    const changeType = this._categorizeChangeType(mutationGroup);
    
    // Extract content from the change
    const content = this._extractContentFromChange(mutationGroup, changeType);
    
    // Check if the change is significant
    if (!this._isSignificantChange(content, changeType)) {
      return null;
    }
    
    // Create change data object
    return {
      type: changeType,
      content: content,
      element: target,
      timestamp: Date.now(),
      context: this._extractContextInfo(target, changeType),
      mutations: mutationGroup
    };
  }

  /**
   * Determine if an element should be ignored
   * @private
   * @param {Element} element - DOM element to check
   * @returns {boolean} - True if the element should be ignored
   */
  _shouldIgnoreElement(element) {
    // Ignore elements that aren't in the DOM
    if (!element || !element.tagName) {
      return true;
    }
    
    // Ignore specified tag types
    if (this.options.ignoredTags.includes(element.tagName)) {
      return true;
    }
    
    // Ignore elements with specified classes
    if (element.classList) {
      for (const className of this.options.ignoredClasses) {
        if (element.classList.contains(className)) {
          return true;
        }
      }
    }
    
    // Ignore hidden elements
    if (element.style && element.style.display === 'none') {
      return true;
    }
    
    return false;
  }

  /**
   * Categorize the type of change from a group of mutations
   * @private
   * @param {MutationRecord[]} mutationGroup - Group of related mutation records
   * @returns {string} - Type of change (addition, removal, modification, etc.)
   */
  _categorizeChangeType(mutationGroup) {
    // Check for additions
    const hasAdditions = mutationGroup.some(m => 
      m.type === 'childList' && m.addedNodes.length > 0
    );
    
    // Check for removals
    const hasRemovals = mutationGroup.some(m => 
      m.type === 'childList' && m.removedNodes.length > 0
    );
    
    // Check for attribute changes
    const hasAttributeChanges = mutationGroup.some(m => 
      m.type === 'attributes'
    );
    
    // Check for text changes
    const hasTextChanges = mutationGroup.some(m => 
      m.type === 'characterData'
    );
    
    // Determine the primary change type
    if (hasAdditions && !hasRemovals) {
      return 'addition';
    } else if (hasRemovals && !hasAdditions) {
      return 'removal';
    } else if (hasAdditions && hasRemovals) {
      return 'replacement';
    } else if (hasAttributeChanges) {
      return 'attribute';
    } else if (hasTextChanges) {
      return 'text';
    } else {
      return 'unknown';
    }
  }

  /**
   * Extract content from a change
   * @private
   * @param {MutationRecord[]} mutationGroup - Group of related mutation records
   * @param {string} changeType - Type of change
   * @returns {Object} - Extracted content
   */
  _extractContentFromChange(mutationGroup, changeType) {
    let textContent = '';
    let htmlContent = '';
    let oldContent = '';
    let newContent = '';
    
    switch (changeType) {
      case 'addition':
        // Extract content from added nodes
        for (const mutation of mutationGroup) {
          if (mutation.type === 'childList') {
            for (const node of mutation.addedNodes) {
              if (node.textContent) {
                textContent += node.textContent + ' ';
              }
              if (node.outerHTML) {
                htmlContent += node.outerHTML;
              }
            }
          }
        }
        newContent = textContent.trim();
        break;
        
      case 'removal':
        // We can't directly access removed nodes' content
        // but we can note that something was removed
        newContent = '[Content removed]';
        break;
        
      case 'replacement':
        // Extract content from both removed and added nodes
        for (const mutation of mutationGroup) {
          if (mutation.type === 'childList') {
            for (const node of mutation.removedNodes) {
              if (node.textContent) {
                oldContent += node.textContent + ' ';
              }
            }
            for (const node of mutation.addedNodes) {
              if (node.textContent) {
                newContent += node.textContent + ' ';
              }
              if (node.outerHTML) {
                htmlContent += node.outerHTML;
              }
            }
          }
        }
        textContent = newContent.trim();
        break;
        
      case 'text':
        // Extract old and new text content
        for (const mutation of mutationGroup) {
          if (mutation.type === 'characterData') {
            oldContent = mutation.oldValue || '';
            newContent = mutation.target.textContent || '';
            textContent = newContent;
          }
        }
        break;
        
      case 'attribute':
        // Extract attribute changes
        const attributeChanges = [];
        for (const mutation of mutationGroup) {
          if (mutation.type === 'attributes') {
            const attrName = mutation.attributeName;
            const oldValue = mutation.oldValue;
            const newValue = mutation.target.getAttribute(attrName);
            
            attributeChanges.push({
              attribute: attrName,
              oldValue: oldValue,
              newValue: newValue
            });
            
            // Special handling for ARIA attributes
            if (attrName.startsWith('aria-') || attrName === 'role') {
              textContent = `${attrName} changed from "${oldValue}" to "${newValue}"`;
            }
          }
        }
        
        // If no specific text content was set for ARIA attributes,
        // use the element's text content
        if (!textContent && mutationGroup[0].target.textContent) {
          textContent = mutationGroup[0].target.textContent.trim();
        }
        break;
        
      default:
        // Default to the target's text content
        if (mutationGroup[0].target.textContent) {
          textContent = mutationGroup[0].target.textContent.trim();
        }
    }
    
    return {
      text: textContent,
      html: htmlContent,
      old: oldContent.trim(),
      new: newContent.trim()
    };
  }

  /**
   * Determine if a change is significant enough to report
   * @private
   * @param {Object} content - Extracted content
   * @param {string} changeType - Type of change
   * @returns {boolean} - True if the change is significant
   */
  _isSignificantChange(content, changeType) {
    // Always consider ARIA attribute changes significant
    if (changeType === 'attribute' && content.text.startsWith('aria-')) {
      return true;
    }
    
    // Check text length for significance
    if (content.text.length < this.options.minTextLength && 
        content.new.length < this.options.minTextLength) {
      return false;
    }
    
    // For text changes, check if the content actually changed
    if (changeType === 'text' && content.old === content.new) {
      return false;
    }
    
    // Additional significance checks could be added here
    
    return true;
  }

  /**
   * Extract contextual information about the change
   * @private
   * @param {Element} element - The element that changed
   * @param {string} changeType - Type of change
   * @returns {Object} - Contextual information
   */
  _extractContextInfo(element, changeType) {
    // Get element role
    const role = element.getAttribute('role') || this._inferRole(element);
    
    // Get element label
    const label = this._getElementLabel(element);
    
    // Get parent context
    const parentContext = this._getParentContext(element);
    
    // Get position information
    const position = this._getElementPosition(element);
    
    return {
      role,
      label,
      parentContext,
      position,
      isForm: this._isFormElement(element),
      isInteractive: this._isInteractiveElement(element),
      isLiveRegion: this._isLiveRegion(element)
    };
  }

  /**
   * Infer the role of an element based on its tag
   * @private
   * @param {Element} element - DOM element
   * @returns {string} - Inferred role
   */
  _inferRole(element) {
    if (!element || !element.tagName) {
      return 'unknown';
    }
    
    switch (element.tagName.toLowerCase()) {
      case 'button':
        return 'button';
      case 'a':
        return 'link';
      case 'input':
        return element.type || 'textbox';
      case 'select':
        return 'combobox';
      case 'textarea':
        return 'textbox';
      case 'img':
        return 'image';
      case 'table':
        return 'table';
      case 'ul':
      case 'ol':
        return 'list';
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6':
        return 'heading';
      default:
        return '';
    }
  }

  /**
   * Get a label for an element
   * @private
   * @param {Element} element - DOM element
   * @returns {string} - Element label
   */
  _getElementLabel(element) {
    // Check for aria-label
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) {
      return ariaLabel;
    }
    
    // Check for aria-labelledby
    const ariaLabelledBy = element.getAttribute('aria-labelledby');
    if (ariaLabelledBy) {
      const labelElement = document.getElementById(ariaLabelledBy);
      if (labelElement) {
        return labelElement.textContent;
      }
    }
    
    // Check for label element (for form controls)
    if (element.id) {
      const labelElement = document.querySelector(`label[for="${element.id}"]`);
      if (labelElement) {
        return labelElement.textContent;
      }
    }
    
    // Use title attribute
    if (element.title) {
      return element.title;
    }
    
    // Use alt text for images
    if (element.tagName === 'IMG' && element.alt) {
      return element.alt;
    }
    
    // Use text content for buttons and links
    if (element.tagName === 'BUTTON' || element.tagName === 'A') {
      return element.textContent;
    }
    
    return '';
  }

  /**
   * Get contextual information from parent elements
   * @private
   * @param {Element} element - DOM element
   * @returns {Object} - Parent context information
   */
  _getParentContext(element) {
    let heading = '';
    let section = '';
    let current = element.parentElement;
    
    // Look up the DOM tree for context
    while (current && current !== document.body) {
      // Check for headings
      if (!heading && /^H[1-6]$/.test(current.tagName)) {
        heading = current.textContent;
      }
      
      // Check for section elements
      if (!section) {
        const role = current.getAttribute('role');
        if (role === 'region' || role === 'article' || role === 'section') {
          section = this._getElementLabel(current) || current.textContent.substring(0, 50);
        }
        
        if (current.tagName === 'SECTION' || current.tagName === 'ARTICLE') {
          section = this._getElementLabel(current) || current.textContent.substring(0, 50);
        }
      }
      
      // Move up the tree
      current = current.parentElement;
    }
    
    return { heading, section };
  }

  /**
   * Get position information for an element
   * @private
   * @param {Element} element - DOM element
   * @returns {Object} - Position information
   */
  _getElementPosition(element) {
    // Get element rect
    const rect = element.getBoundingClientRect();
    
    // Determine position in viewport
    const viewportPosition = {
      top: rect.top,
      left: rect.left,
      inViewport: (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= window.innerHeight &&
        rect.right <= window.innerWidth
      )
    };
    
    return viewportPosition;
  }

  /**
   * Check if an element is a form control
   * @private
   * @param {Element} element - DOM element
   * @returns {boolean} - True if the element is a form control
   */
  _isFormElement(element) {
    const formElements = ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'];
    return formElements.includes(element.tagName);
  }

  /**
   * Check if an element is interactive
   * @private
   * @param {Element} element - DOM element
   * @returns {boolean} - True if the element is interactive
   */
  _isInteractiveElement(element) {
    // Check tag name
    const interactiveTags = ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'];
    if (interactiveTags.includes(element.tagName)) {
      return true;
    }
    
    // Check role
    const interactiveRoles = [
      'button', 'link', 'checkbox', 'radio', 'textbox', 'combobox',
      'menu', 'menuitem', 'tab', 'tabpanel', 'slider', 'switch'
    ];
    const role = element.getAttribute('role');
    if (role && interactiveRoles.includes(role)) {
      return true;
    }
    
    // Check for click handlers
    if (element.onclick || element.getAttribute('onclick')) {
      return true;
    }
    
    return false;
  }

  /**
   * Check if an element is a live region
   * @private
   * @param {Element} element - DOM element
   * @returns {boolean} - True if the element is a live region
   */
  _isLiveRegion(element) {
    return element.getAttribute('aria-live') !== null;
  }

  /**
   * Notify all registered listeners of significant changes
   * @private
   * @param {Array} changes - Array of change data objects
   */
  _notifyChangeListeners(changes) {
    for (const listener of this.changeListeners) {
      try {
        listener(changes);
      } catch (error) {
        console.error('Error in change listener:', error);
      }
    }
  }
}

// Export the module
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ContentDetectionModule;
}
