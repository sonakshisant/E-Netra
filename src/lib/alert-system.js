// Alert System Module
// Responsible for delivering notifications about dynamic content changes to users

class AlertSystemModule {
  constructor(options = {}) {
    this.options = {
      // Default options
      defaultAlertMethod: 'screenreader', // screenreader, audio, visual, or combined
      visualAlertDuration: 5000, // ms to show visual alerts
      audioEnabled: true, // whether to play audio cues
      hapticEnabled: false, // whether to use haptic feedback (if available)
      queueAlerts: true, // whether to queue alerts or show immediately
      maxQueueSize: 10, // maximum number of alerts in the queue
      ...options
    };
    
    this.alertQueue = [];
    this.isProcessing = false;
    this.alertContainer = null;
    this.audioContext = null;
    this.alertSounds = {};
    
    // Alert methods for different content types
    this.contentTypeAlertMethods = {
      text: 'screenreader',
      form: 'screenreader',
      error: 'combined',
      navigation: 'screenreader',
      media: 'screenreader',
      chat: 'combined',
      advertisement: 'visual'
    };
  }

  /**
   * Initialize the alert system
   */
  initialize() {
    // Create alert container for visual alerts
    this._createAlertContainer();
    
    // Initialize audio context if audio is enabled
    if (this.options.audioEnabled) {
      this._initializeAudio();
    }
    
    console.log('Alert system initialized');
  }

  /**
   * Create the visual alert container
   * @private
   */
  _createAlertContainer() {
    // Check if container already exists
    if (document.getElementById('ai-accessibility-alerts')) {
      this.alertContainer = document.getElementById('ai-accessibility-alerts');
      return;
    }
    
    // Create container
    this.alertContainer = document.createElement('div');
    this.alertContainer.id = 'ai-accessibility-alerts';
    this.alertContainer.setAttribute('aria-live', 'polite');
    this.alertContainer.setAttribute('role', 'log');
    
    // Style the container
    Object.assign(this.alertContainer.style, {
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      zIndex: '9999',
      maxWidth: '400px',
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      pointerEvents: 'none' // Allow clicking through the container
    });
    
    // Add to document
    document.body.appendChild(this.alertContainer);
  }

  /**
   * Initialize audio context and load sounds
   * @private
   */
  _initializeAudio() {
    try {
      // Create audio context
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Define sound patterns for different priority levels
      this._loadAudioPatterns();
      
      console.log('Audio system initialized');
    } catch (error) {
      console.error('Failed to initialize audio:', error);
      this.options.audioEnabled = false;
    }
  }

  /**
   * Load audio patterns for different alert types
   * @private
   */
  _loadAudioPatterns() {
    // In a real implementation, these would be actual sound files
    // For the prototype, we'll use simple oscillator patterns
    
    this.alertSounds = {
      high: this._createTonePattern([
        { frequency: 880, duration: 100 },
        { frequency: 0, duration: 50 },
        { frequency: 880, duration: 100 }
      ]),
      medium: this._createTonePattern([
        { frequency: 440, duration: 150 }
      ]),
      low: this._createTonePattern([
        { frequency: 220, duration: 200 }
      ])
    };
  }

  /**
   * Create a tone pattern function
   * @private
   * @param {Array} pattern - Array of frequency/duration objects
   * @returns {Function} - Function to play the pattern
   */
  _createTonePattern(pattern) {
    return () => {
      if (!this.audioContext) return Promise.resolve();
      
      return new Promise(resolve => {
        let time = this.audioContext.currentTime;
        
        pattern.forEach(tone => {
          if (tone.frequency > 0) {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.type = 'sine';
            oscillator.frequency.value = tone.frequency;
            
            gainNode.gain.value = 0.2; // Low volume
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.start(time);
            oscillator.stop(time + tone.duration / 1000);
          }
          
          time += tone.duration / 1000;
        });
        
        // Resolve after the pattern completes
        setTimeout(resolve, pattern.reduce((sum, tone) => sum + tone.duration, 0));
      });
    };
  }

  /**
   * Show an alert to the user
   * @param {Object} alertData - Alert data object
   * @param {string} alertData.summary - Alert summary text
   * @param {number} alertData.priority - Alert priority (1-10)
   * @param {string} alertData.contentType - Type of content
   * @param {Object} alertData.original - Original change data
   * @returns {Promise<void>} - Promise that resolves when the alert is shown
   */
  async showAlert(alertData) {
    // Add to queue if queueing is enabled
    if (this.options.queueAlerts) {
      // Add to queue
      this.alertQueue.push(alertData);
      
      // Limit queue size
      if (this.alertQueue.length > this.options.maxQueueSize) {
        this.alertQueue.shift();
      }
      
      // Process queue if not already processing
      if (!this.isProcessing) {
        this._processAlertQueue();
      }
      
      return;
    }
    
    // Show alert immediately if queueing is disabled
    await this._showSingleAlert(alertData);
  }

  /**
   * Process the alert queue
   * @private
   */
  async _processAlertQueue() {
    this.isProcessing = true;
    
    while (this.alertQueue.length > 0) {
      const alert = this.alertQueue.shift();
      await this._showSingleAlert(alert);
    }
    
    this.isProcessing = false;
  }

  /**
   * Show a single alert
   * @private
   * @param {Object} alertData - Alert data object
   * @returns {Promise<void>} - Promise that resolves when the alert is shown
   */
  async _showSingleAlert(alertData) {
    // Determine alert method based on content type and priority
    const alertMethod = this._determineAlertMethod(alertData);
    
    // Show alert using the determined method
    switch (alertMethod) {
      case 'screenreader':
        await this._showScreenReaderAlert(alertData);
        break;
      case 'visual':
        await this._showVisualAlert(alertData);
        break;
      case 'audio':
        await this._playAudioAlert(alertData);
        break;
      case 'combined':
        // Show all alert types for combined method
        await Promise.all([
          this._showScreenReaderAlert(alertData),
          this._showVisualAlert(alertData),
          this._playAudioAlert(alertData)
        ]);
        break;
      default:
        await this._showScreenReaderAlert(alertData);
    }
  }

  /**
   * Determine the alert method based on content type and priority
   * @private
   * @param {Object} alertData - Alert data object
   * @returns {string} - Alert method
   */
  _determineAlertMethod(alertData) {
    // Get method for content type
    const contentType = alertData.contentType || 'text';
    const methodForType = this.contentTypeAlertMethods[contentType] || this.options.defaultAlertMethod;
    
    // For high priority alerts, use combined method
    if (alertData.priority >= 8) {
      return 'combined';
    }
    
    return methodForType;
  }

  /**
   * Show a screen reader alert
   * @private
   * @param {Object} alertData - Alert data object
   * @returns {Promise<void>} - Promise that resolves when the alert is shown
   */
  async _showScreenReaderAlert(alertData) {
    return new Promise(resolve => {
      // Create alert element
      const alertElement = document.createElement('div');
      alertElement.setAttribute('aria-live', alertData.priority >= 7 ? 'assertive' : 'polite');
      alertElement.setAttribute('role', 'alert');
      alertElement.style.position = 'absolute';
      alertElement.style.width = '1px';
      alertElement.style.height = '1px';
      alertElement.style.overflow = 'hidden';
      alertElement.style.clip = 'rect(0, 0, 0, 0)';
      alertElement.style.whiteSpace = 'nowrap';
      
      // Set the alert text
      alertElement.textContent = alertData.summary;
      
      // Add to document
      document.body.appendChild(alertElement);
      
      // Remove after a delay
      setTimeout(() => {
        if (alertElement.parentNode) {
          alertElement.parentNode.removeChild(alertElement);
        }
        resolve();
      }, 3000);
    });
  }

  /**
   * Show a visual alert
   * @private
   * @param {Object} alertData - Alert data object
   * @returns {Promise<void>} - Promise that resolves when the alert is shown
   */
  async _showVisualAlert(alertData) {
    return new Promise(resolve => {
      // Create alert element
      const alertElement = document.createElement('div');
      alertElement.setAttribute('role', 'status');
      alertElement.setAttribute('aria-hidden', 'true'); // Hide from screen readers since we use a separate screen reader alert
      
      // Style based on priority
      const priorityClass = alertData.priority >= 7 ? 'high' : 
                           alertData.priority >= 4 ? 'medium' : 'low';
      
      // Set styles
      Object.assign(alertElement.style, {
        backgroundColor: this._getPriorityColor(alertData.priority),
        color: '#fff',
        padding: '10px 15px',
        borderRadius: '4px',
        boxShadow: '0 2px 5px rgba(0, 0, 0, 0.2)',
        marginTop: '10px',
        transition: 'opacity 0.3s ease-in-out',
        opacity: '0',
        maxWidth: '100%',
        pointerEvents: 'auto', // Make the alert clickable
        cursor: 'pointer'
      });
      
      // Set the alert text
      alertElement.textContent = alertData.summary;
      
      // Add to container
      this.alertContainer.appendChild(alertElement);
      
      // Trigger reflow for animation
      alertElement.offsetHeight;
      
      // Show the alert
      alertElement.style.opacity = '1';
      
      // Add click handler to dismiss
      alertElement.addEventListener('click', () => {
        alertElement.style.opacity = '0';
        setTimeout(() => {
          if (alertElement.parentNode) {
            alertElement.parentNode.removeChild(alertElement);
          }
        }, 300);
      });
      
      // Remove after duration
      setTimeout(() => {
        alertElement.style.opacity = '0';
        setTimeout(() => {
          if (alertElement.parentNode) {
            alertElement.parentNode.removeChild(alertElement);
          }
          resolve();
        }, 300);
      }, this.options.visualAlertDuration);
    });
  }

  /**
   * Play an audio alert
   * @private
   * @param {Object} alertData - Alert data object
   * @returns {Promise<void>} - Promise that resolves when the alert is played
   */
  async _playAudioAlert(alertData) {
    if (!this.options.audioEnabled || !this.audioContext) {
      return Promise.resolve();
    }
    
    // Determine sound based on priority
    let sound;
    if (alertData.priority >= 7) {
      sound = this.alertSounds.high;
    } else if (alertData.priority >= 4) {
      sound = this.alertSounds.medium;
    } else {
      sound = this.alertSounds.low;
    }
    
    // Play the sound
    return sound();
  }

  /**
   * Get color based on priority
   * @private
   * @param {number} priority - Alert priority
   * @returns {string} - CSS color value
   */
  _getPriorityColor(priority) {
    if (priority >= 7) {
      return '#d9534f'; // High priority - red
    } else if (priority >= 4) {
      return '#5bc0de'; // Medium priority - blue
    } else {
      return '#5cb85c'; // Low priority - green
    }
  }

  /**
   * Update alert preferences
   * @param {Object} preferences - New alert preferences
   */
  updatePreferences(preferences) {
    this.options = {
      ...this.options,
      ...preferences
    };
    
    // Update content type alert methods if provided
    if (preferences.contentTypeAlertMethods) {
      this.contentTypeAlertMethods = {
        ...this.contentTypeAlertMethods,
        ...preferences.contentTypeAlertMethods
      };
    }
    
    // Reinitialize audio if needed
    if (preferences.audioEnabled !== undefined && 
        preferences.audioEnabled !== this.options.audioEnabled) {
      if (preferences.audioEnabled) {
        this._initializeAudio();
      } else {
        this.audioContext = null;
      }
    }
  }

  /**
   * Get current alert preferences
   * @returns {Object} - Current preferences
   */
  getPreferences() {
    return {
      ...this.options,
      contentTypeAlertMethods: { ...this.contentTypeAlertMethods }
    };
  }

  /**
   * Clean up resources
   */
  cleanup() {
    // Remove alert container
    if (this.alertContainer && this.alertContainer.parentNode) {
      this.alertContainer.parentNode.removeChild(this.alertContainer);
    }
    
    // Close audio context
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
    
    // Clear queue
    this.alertQueue = [];
    this.isProcessing = false;
  }
}

// Export the module
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AlertSystemModule;
}
