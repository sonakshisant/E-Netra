// Framework Compatibility Module
// Responsible for ensuring the extension works correctly with different JavaScript frameworks

class FrameworkCompatibilityModule {
  constructor() {
    this.detectedFramework = null;
    this.adapter = null;
    this.initialized = false;
  }

  /**
   * Initialize the framework compatibility module
   */
  initialize() {
    this.detectedFramework = this._detectFramework();
    this.adapter = this._createAdapter(this.detectedFramework);
    this.initialized = true;
    
    console.log(`Detected framework: ${this.detectedFramework}`);
  }

  /**
   * Detect the JavaScript framework used by the current website
   * @private
   * @returns {string} - Detected framework name
   */
  _detectFramework() {
    // Check for React
    if (this._detectReact()) {
      return 'react';
    }
    
    // Check for Angular
    if (this._detectAngular()) {
      return 'angular';
    }
    
    // Check for Vue.js
    if (this._detectVue()) {
      return 'vue';
    }
    
    // Default to vanilla JS
    return 'vanilla';
  }

  /**
   * Detect React framework
   * @private
   * @returns {boolean} - True if React is detected
   */
  _detectReact() {
    // Check for React DevTools global hook
    if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      return true;
    }
    
    // Check for React-specific attributes in DOM
    if (document.querySelector('[data-reactroot], [data-reactid]')) {
      return true;
    }
    
    // Check for React Fiber DOM properties
    const possibleReactElements = document.querySelectorAll('div, span, a, button');
    for (let i = 0; i < Math.min(possibleReactElements.length, 50); i++) {
      const element = possibleReactElements[i];
      // React Fiber uses __reactFiber$ or __reactInternalInstance$ prefixed keys
      const reactKey = Object.keys(element).find(key => 
        key.startsWith('__reactFiber$') || 
        key.startsWith('__reactInternalInstance$') ||
        key.startsWith('__reactProps$')
      );
      
      if (reactKey) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Detect Angular framework
   * @private
   * @returns {boolean} - True if Angular is detected
   */
  _detectAngular() {
    // Check for Angular global
    if (window.ng || window.angular) {
      return true;
    }
    
    // Check for Angular-specific attributes in DOM
    if (document.querySelector('[ng-app], [ng-controller], [ng-model]')) {
      return true;
    }
    
    // Check for Angular 2+ specific attributes
    if (document.querySelector('[_nghost-], [_ngcontent-]')) {
      return true;
    }
    
    // Check for Angular elements
    if (document.querySelector('app-root, [ng-version]')) {
      return true;
    }
    
    return false;
  }

  /**
   * Detect Vue.js framework
   * @private
   * @returns {boolean} - True if Vue.js is detected
   */
  _detectVue() {
    // Check for Vue DevTools global
    if (window.__VUE__) {
      return true;
    }
    
    // Check for Vue-specific attributes in DOM
    if (document.querySelector('[data-v-]')) {
      return true;
    }
    
    // Check for Vue instance
    const possibleVueElements = document.querySelectorAll('div, span, a, button');
    for (let i = 0; i < Math.min(possibleVueElements.length, 50); i++) {
      const element = possibleVueElements[i];
      if (element.__vue__ || element.__vue_app__) {
        return true;
      }
    }
    
    // Check for Vue 3 specific properties
    if (document.querySelector('[data-v-app]')) {
      return true;
    }
    
    return false;
  }

  /**
   * Create a framework-specific adapter
   * @private
   * @param {string} framework - Detected framework name
   * @returns {Object} - Framework adapter
   */
  _createAdapter(framework) {
    switch (framework) {
      case 'react':
        return new ReactAdapter();
      case 'angular':
        return new AngularAdapter();
      case 'vue':
        return new VueAdapter();
      default:
        return new VanillaJSAdapter();
    }
  }

  /**
   * Enhance a content detection module with framework-specific logic
   * @param {Object} contentDetector - Content detection module instance
   * @returns {Object} - Enhanced content detector
   */
  enhanceContentDetection(contentDetector) {
    if (!this.initialized) {
      this.initialize();
    }
    
    return this.adapter.enhanceContentDetection(contentDetector);
  }

  /**
   * Get information about the detected framework
   * @returns {Object} - Framework information
   */
  getFrameworkInfo() {
    if (!this.initialized) {
      this.initialize();
    }
    
    return {
      name: this.detectedFramework,
      version: this.adapter.getVersion(),
      features: this.adapter.getFeatures()
    };
  }
}

/**
 * Base adapter class for framework compatibility
 */
class BaseFrameworkAdapter {
  constructor() {
    this.version = 'unknown';
  }
  
  /**
   * Enhance content detection with framework-specific logic
   * @param {Object} contentDetector - Content detection module instance
   * @returns {Object} - Enhanced content detector
   */
  enhanceContentDetection(contentDetector) {
    // Base implementation returns the original detector
    return contentDetector;
  }
  
  /**
   * Get framework version
   * @returns {string} - Framework version
   */
  getVersion() {
    return this.version;
  }
  
  /**
   * Get framework-specific features
   * @returns {Array} - List of features
   */
  getFeatures() {
    return [];
  }
}

/**
 * React-specific adapter
 */
class ReactAdapter extends BaseFrameworkAdapter {
  constructor() {
    super();
    this.version = this._detectReactVersion();
  }
  
  /**
   * Detect React version
   * @private
   * @returns {string} - React version
   */
  _detectReactVersion() {
    // Try to detect React version
    try {
      // Check for React global
      if (window.React && window.React.version) {
        return window.React.version;
      }
      
      // Check for React DOM global
      if (window.ReactDOM && window.ReactDOM.version) {
        return window.ReactDOM.version;
      }
    } catch (e) {
      console.error('Error detecting React version:', e);
    }
    
    return 'unknown';
  }
  
  /**
   * Enhance content detection with React-specific logic
   * @param {Object} contentDetector - Content detection module instance
   * @returns {Object} - Enhanced content detector
   */
  enhanceContentDetection(contentDetector) {
    // Create a proxy around the original detector
    const enhancedDetector = Object.create(contentDetector);
    
    // Override the startObserving method to add React-specific handling
    const originalStartObserving = contentDetector.startObserving.bind(contentDetector);
    enhancedDetector.startObserving = function(target) {
      // Call the original method
      originalStartObserving(target);
      
      // Add React-specific mutation handling
      this._addReactSpecificHandling();
    };
    
    // Add React-specific handling method
    enhancedDetector._addReactSpecificHandling = function() {
      // Monitor React state updates by patching React methods
      this._monitorReactStateUpdates();
      
      // Add special handling for React portals
      this._handleReactPortals();
    };
    
    // Monitor React state updates
    enhancedDetector._monitorReactStateUpdates = function() {
      // This is a simplified implementation
      // In a real extension, this would use more sophisticated techniques
      
      // Try to detect React component updates
      if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
        try {
          const hook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
          
          // Monitor component updates
          if (hook.onCommitFiberRoot && !hook._patchedByAccessibility) {
            const originalOnCommitFiberRoot = hook.onCommitFiberRoot.bind(hook);
            
            hook.onCommitFiberRoot = (rendererID, root, ...args) => {
              // Call original method
              originalOnCommitFiberRoot(rendererID, root, ...args);
              
              // Process the update
              setTimeout(() => {
                // This timeout allows React to finish rendering
                // before we analyze the changes
                this._analyzeReactUpdate(root);
              }, 50);
            };
            
            hook._patchedByAccessibility = true;
          }
        } catch (e) {
          console.error('Error patching React DevTools hook:', e);
        }
      }
    };
    
    // Handle React portals
    enhancedDetector._handleReactPortals = function() {
      // React portals can create content outside the normal DOM hierarchy
      // This method would implement special handling for them
      
      // In a real implementation, this would detect portal containers
      // and ensure they're properly observed
    };
    
    // Analyze React updates
    enhancedDetector._analyzeReactUpdate = function(root) {
      // This is a simplified implementation
      // In a real extension, this would analyze the Fiber tree
      
      // For now, we'll just trigger a manual check of the DOM
      // after React has finished updating
      
      // This helps catch updates that might be missed by the MutationObserver
      // due to React's batching and virtual DOM
    };
    
    return enhancedDetector;
  }
  
  /**
   * Get React-specific features
   * @returns {Array} - List of features
   */
  getFeatures() {
    return [
      'Virtual DOM',
      'Component-based architecture',
      'Unidirectional data flow',
      'JSX syntax',
      'React Fiber reconciliation'
    ];
  }
}

/**
 * Angular-specific adapter
 */
class AngularAdapter extends BaseFrameworkAdapter {
  constructor() {
    super();
    this.version = this._detectAngularVersion();
  }
  
  /**
   * Detect Angular version
   * @private
   * @returns {string} - Angular version
   */
  _detectAngularVersion() {
    // Try to detect Angular version
    try {
      // Check for Angular 1.x
      if (window.angular && window.angular.version) {
        return window.angular.version.full;
      }
      
      // Check for Angular 2+
      const ngVersionElement = document.querySelector('[ng-version]');
      if (ngVersionElement) {
        return ngVersionElement.getAttribute('ng-version');
      }
    } catch (e) {
      console.error('Error detecting Angular version:', e);
    }
    
    return 'unknown';
  }
  
  /**
   * Enhance content detection with Angular-specific logic
   * @param {Object} contentDetector - Content detection module instance
   * @returns {Object} - Enhanced content detector
   */
  enhanceContentDetection(contentDetector) {
    // Create a proxy around the original detector
    const enhancedDetector = Object.create(contentDetector);
    
    // Override the startObserving method to add Angular-specific handling
    const originalStartObserving = contentDetector.startObserving.bind(contentDetector);
    enhancedDetector.startObserving = function(target) {
      // Call the original method
      originalStartObserving(target);
      
      // Add Angular-specific mutation handling
      this._addAngularSpecificHandling();
    };
    
    // Add Angular-specific handling method
    enhancedDetector._addAngularSpecificHandling = function() {
      // Monitor Angular change detection
      this._monitorAngularChangeDetection();
      
      // Handle Angular-specific attributes
      this._handleAngularAttributes();
    };
    
    // Monitor Angular change detection
    enhancedDetector._monitorAngularChangeDetection = function() {
      // This is a simplified implementation
      // In a real extension, this would use more sophisticated techniques
      
      // For Angular 1.x
      if (window.angular && window.angular.element) {
        try {
          const rootElement = window.angular.element(document);
          if (rootElement.scope && rootElement.scope()) {
            const rootScope = rootElement.scope();
            
            // Patch $digest to detect changes
            if (rootScope.$digest && !rootScope.$digest._patchedByAccessibility) {
              const originalDigest = rootScope.$digest.bind(rootScope);
              
              rootScope.$digest = function() {
                const result = originalDigest();
                
                // Process after digest
                setTimeout(() => {
                  // This timeout allows Angular to finish rendering
                  // before we analyze the changes
                }, 50);
                
                return result;
              };
              
              rootScope.$digest._patchedByAccessibility = true;
            }
          }
        } catch (e) {
          console.error('Error patching Angular 1.x:', e);
        }
      }
      
      // For Angular 2+
      // This is more complex and would require a more sophisticated approach
      // in a real implementation
    };
    
    // Handle Angular-specific attributes
    enhancedDetector._handleAngularAttributes = function() {
      // Angular uses specific attributes for binding and templates
      // This method would implement special handling for them
      
      // In a real implementation, this would detect and handle
      // Angular-specific DOM patterns
    };
    
    return enhancedDetector;
  }
  
  /**
   * Get Angular-specific features
   * @returns {Array} - List of features
   */
  getFeatures() {
    return [
      'Two-way data binding',
      'Dependency injection',
      'Component-based architecture',
      'Zone.js change detection',
      'TypeScript integration'
    ];
  }
}

/**
 * Vue.js-specific adapter
 */
class VueAdapter extends BaseFrameworkAdapter {
  constructor() {
    super();
    this.version = this._detectVueVersion();
  }
  
  /**
   * Detect Vue.js version
   * @private
   * @returns {string} - Vue.js version
   */
  _detectVueVersion() {
    // Try to detect Vue.js version
    try {
      // Check for Vue global
      if (window.Vue && window.Vue.version) {
        return window.Vue.version;
      }
      
      // For Vue 3, check for app version
      const appElement = document.querySelector('[data-v-app]');
      if (appElement && appElement.__vue_app__) {
        return 'Vue 3.x';
      }
    } catch (e) {
      console.error('Error detecting Vue.js version:', e);
    }
    
    return 'unknown';
  }
  
  /**
   * Enhance content detection with Vue.js-specific logic
   * @param {Object} contentDetector - Content detection module instance
   * @returns {Object} - Enhanced content detector
   */
  enhanceContentDetection(contentDetector) {
    // Create a proxy around the original detector
    const enhancedDetector = Object.create(contentDetector);
    
    // Override the startObserving method to add Vue.js-specific handling
    const originalStartObserving = contentDetector.startObserving.bind(contentDetector);
    enhancedDetector.startObserving = function(target) {
      // Call the original method
      originalStartObserving(target);
      
      // Add Vue.js-specific mutation handling
      this._addVueSpecificHandling();
    };
    
    // Add Vue.js-specific handling method
    enhancedDetector._addVueSpecificHandling = function() {
      // Monitor Vue.js reactivity system
      this._monitorVueReactivity();
      
      // Handle Vue.js-specific attributes
      this._handleVueAttributes();
    };
    
    // Monitor Vue.js reactivity system
    enhancedDetector._monitorVueReactivity = function() {
      // This is a simplified implementation
      // In a real extension, this would use more sophisticated techniques
      
      // For Vue 2.x
      if (window.Vue && !window.Vue._patchedByAccessibility) {
        try {
          const originalNextTick = window.Vue.nextTick;
          
          window.Vue.nextTick = function(...args) {
            const result = originalNextTick.apply(this, args);
            
            // Process after nextTick
            setTimeout(() => {
              // This timeout allows Vue to finish rendering
              // before we analyze the changes
            }, 50);
            
            return result;
          };
          
          window.Vue._patchedByAccessibility = true;
        } catch (e) {
          console.error('Error patching Vue.js:', e);
        }
      }
      
      // For Vue 3.x
      // This is more complex and would require a more sophisticated approach
      // in a real implementation
    };
    
    // Handle Vue.js-specific attributes
    enhancedDetector._handleVueAttributes = function() {
      // Vue.js uses specific attributes for binding and templates
      // This method would implement special handling for them
      
      // In a real implementation, this would detect and handle
      // Vue.js-specific DOM patterns
    };
    
    return enhancedDetector;
  }
  
  /**
   * Get Vue.js-specific features
   * @returns {Array} - List of features
   */
  getFeatures() {
    return [
      'Reactive data binding',
      'Component-based architecture',
      'Virtual DOM',
      'Template syntax',
      'Composition API (Vue 3)'
    ];
  }
}

/**
 * Vanilla JS adapter (fallback)
 */
class VanillaJSAdapter extends BaseFrameworkAdapter {
  constructor() {
    super();
    this.version = 'N/A';
  }
  
  /**
   * Enhance content detection with vanilla JS-specific logic
   * @param {Object} contentDetector - Content detection module instance
   * @returns {Object} - Enhanced content detector
   */
  enhanceContentDetection(contentDetector) {
    // For vanilla JS, we don't need special handling
    // Just return the original detector
    return contentDetector;
  }
  
  /**
   * Get vanilla JS-specific features
   * @returns {Array} - List of features
   */
  getFeatures() {
    return [
      'Standard DOM manipulation',
      'Native browser events',
      'No virtual DOM',
      'Direct DOM updates'
    ];
  }
}

// Export the module
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    FrameworkCompatibilityModule,
    ReactAdapter,
    AngularAdapter,
    VueAdapter,
    VanillaJSAdapter
  };
}
