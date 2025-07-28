// Main JavaScript for AI-Powered Dynamic Content Interpreter

document.addEventListener('DOMContentLoaded', function() {
    // Cache DOM elements
    const contentTypeSelect = document.getElementById('content-type');
    const operationSelect = document.getElementById('operation');
    const inputTextarea = document.getElementById('input-text');
    const optionsContainer = document.getElementById('options-container');
    const interpretButton = document.getElementById('interpret-button');
    const clearButton = document.getElementById('clear-button');
    const outputContent = document.getElementById('output-content');
    const loadingIndicator = document.getElementById('loading');
    const alertContainer = document.getElementById('alert-container');
    
    // Available operations for each content type
    const contentOperations = {};
    
    // Options templates for different operations
    const operationOptions = {
        'transform': `
            <div class="form-group">
                <label for="style-option">Style:</label>
                <select id="style-option" class="option-input">
                    <option value="formal">Formal</option>
                    <option value="casual">Casual</option>
                    <option value="technical">Technical</option>
                    <option value="creative">Creative</option>
                </select>
            </div>
        `,
        'story': `
            <div class="form-group">
                <label for="genre-option">Genre:</label>
                <select id="genre-option" class="option-input">
                    <option value="fantasy">Fantasy</option>
                    <option value="sci-fi">Science Fiction</option>
                    <option value="mystery">Mystery</option>
                    <option value="romance">Romance</option>
                </select>
            </div>
            <div class="form-group">
                <label for="length-option">Length:</label>
                <select id="length-option" class="option-input">
                    <option value="short">Short</option>
                    <option value="medium">Medium</option>
                    <option value="long">Long</option>
                </select>
            </div>
        `,
        'poem': `
            <div class="form-group">
                <label for="style-option">Style:</label>
                <select id="style-option" class="option-input">
                    <option value="free-verse">Free Verse</option>
                    <option value="haiku">Haiku</option>
                    <option value="sonnet">Sonnet</option>
                    <option value="limerick">Limerick</option>
                </select>
            </div>
        `
    };
    
    // Fetch available operations on page load
    fetchAvailableOperations();
    
    // Event listeners
    contentTypeSelect.addEventListener('change', updateOperations);
    operationSelect.addEventListener('change', updateOptions);
    interpretButton.addEventListener('click', interpretContent);
    clearButton.addEventListener('click', clearForm);
    
    // Fetch available operations from the API
    function fetchAvailableOperations() {
        showLoading(true);
        
        fetch('/api/interpreter/operations')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    // Store available operations
                    Object.assign(contentOperations, data.available_operations);
                    
                    // Populate content type select
                    populateContentTypes();
                    
                    // Initialize operations for the default content type
                    updateOperations();
                } else {
                    showAlert('Error: ' + data.error, 'danger');
                }
            })
            .catch(error => {
                showAlert('Failed to fetch operations: ' + error.message, 'danger');
            })
            .finally(() => {
                showLoading(false);
            });
    }
    
    // Populate content type select options
    function populateContentTypes() {
        contentTypeSelect.innerHTML = '';
        
        Object.keys(contentOperations).forEach(contentType => {
            const option = document.createElement('option');
            option.value = contentType;
            option.textContent = contentType.charAt(0).toUpperCase() + contentType.slice(1);
            contentTypeSelect.appendChild(option);
        });
    }
    
    // Update operations based on selected content type
    function updateOperations() {
        const selectedContentType = contentTypeSelect.value;
        operationSelect.innerHTML = '';
        
        if (contentOperations[selectedContentType]) {
            contentOperations[selectedContentType].forEach(operation => {
                const option = document.createElement('option');
                option.value = operation;
                option.textContent = operation.charAt(0).toUpperCase() + operation.slice(1);
                operationSelect.appendChild(option);
            });
            
            // Update options for the selected operation
            updateOptions();
        }
    }
    
    // Update options based on selected operation
    function updateOptions() {
        const selectedOperation = operationSelect.value;
        
        // Clear current options
        optionsContainer.innerHTML = '';
        
        // Add operation-specific options if available
        if (operationOptions[selectedOperation]) {
            optionsContainer.innerHTML = operationOptions[selectedOperation];
        }
    }
    
    // Interpret content using the API
    function interpretContent() {
        const contentType = contentTypeSelect.value;
        const operation = operationSelect.value;
        const input = inputTextarea.value.trim();
        
        // Validate input
        if (!input) {
            showAlert('Please enter some content to interpret', 'danger');
            return;
        }
        
        // Collect options if any
        const options = {};
        document.querySelectorAll('.option-input').forEach(optionInput => {
            options[optionInput.id.replace('-option', '')] = optionInput.value;
        });
        
        // Prepare request data
        const requestData = {
            content_type: contentType,
            operation: operation,
            input: input,
            options: options
        };
        
        // Show loading indicator
        showLoading(true);
        
        // Send request to API
        fetch('/api/interpreter/interpret', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    // Display the result
                    displayResult(data);
                    showAlert('Content interpreted successfully!', 'success');
                } else {
                    showAlert('Error: ' + data.error, 'danger');
                }
            })
            .catch(error => {
                showAlert('Failed to interpret content: ' + error.message, 'danger');
            })
            .finally(() => {
                showLoading(false);
            });
    }
    
    // Display the interpretation result
    function displayResult(data) {
        // Clear placeholder if present
        outputContent.classList.remove('output-placeholder');
        
        // Apply appropriate styling based on content type
        if (data.content_type === 'code') {
            outputContent.className = 'output-content output-code';
        } else {
            outputContent.className = 'output-content output-result';
        }
        
        // Set the result content
        outputContent.textContent = data.result;
        
        // Add to history (simplified implementation)
        addToHistory(data);
    }
    
    // Add interpreted content to history
    function addToHistory(data) {
        const historyContainer = document.getElementById('history-items');
        
        if (historyContainer) {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            historyItem.innerHTML = `
                <h3>${data.operation.charAt(0).toUpperCase() + data.operation.slice(1)} ${data.content_type}</h3>
                <div class="history-meta">
                    <span>${new Date().toLocaleTimeString()}</span>
                    <span>${data.content_type}</span>
                </div>
                <div class="history-preview">${data.input.substring(0, 50)}${data.input.length > 50 ? '...' : ''}</div>
            `;
            
            // Add click event to restore this content
            historyItem.addEventListener('click', function() {
                contentTypeSelect.value = data.content_type;
                updateOperations();
                operationSelect.value = data.operation;
                updateOptions();
                inputTextarea.value = data.input;
                
                // Set options if available
                if (data.options_applied) {
                    Object.keys(data.options_applied).forEach(key => {
                        const optionInput = document.getElementById(`${key}-option`);
                        if (optionInput) {
                            optionInput.value = data.options_applied[key];
                        }
                    });
                }
                
                // Display the result
                displayResult(data);
            });
            
            // Add to history (prepend to show newest first)
            historyContainer.prepend(historyItem);
        }
    }
    
    // Clear the form
    function clearForm() {
        inputTextarea.value = '';
        outputContent.textContent = 'Interpreted content will appear here...';
        outputContent.className = 'output-content output-placeholder';
        clearAlert();
    }
    
    // Show or hide loading indicator
    function showLoading(show) {
        loadingIndicator.style.display = show ? 'block' : 'none';
    }
    
    // Show alert message
    function showAlert(message, type) {
        clearAlert();
        
        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.textContent = message;
        
        alertContainer.appendChild(alert);
        
        // Auto-hide success alerts after 5 seconds
        if (type === 'success') {
            setTimeout(clearAlert, 5000);
        }
    }
    
    // Clear alert messages
    function clearAlert() {
        alertContainer.innerHTML = '';
    }
    
    // Analyze content to suggest content type
    function analyzeContent() {
        const input = inputTextarea.value.trim();
        
        if (input.length < 10) {
            return; // Too short to analyze
        }
        
        fetch('/api/interpreter/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content: input })
        })
            .then(response => response.json())
            .then(data => {
                if (data.success && data.analysis.potential_content_type) {
                    // Auto-select the suggested content type
                    contentTypeSelect.value = data.analysis.potential_content_type;
                    updateOperations();
                }
            })
            .catch(error => {
                console.error('Error analyzing content:', error);
            });
    }
    
    // Add debounced content analysis
    let analyzeTimeout;
    inputTextarea.addEventListener('input', function() {
        clearTimeout(analyzeTimeout);
        analyzeTimeout = setTimeout(analyzeContent, 1000); // Analyze after 1 second of inactivity
    });
});
