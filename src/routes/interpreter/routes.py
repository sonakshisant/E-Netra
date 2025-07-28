from flask import request, jsonify
import json
from src.routes.interpreter import interpreter_bp

# Dictionary to store different content interpretation models
content_models = {
    "text": {
        "summarize": lambda text, **kwargs: f"Summary: {text[:100]}...",
        "expand": lambda text, **kwargs: f"{text}\n\nExpanded content with additional details based on the original text.",
        "transform": lambda text, **kwargs: f"Transformed ({kwargs.get('style', 'default')}): {text}"
    },
    "code": {
        "explain": lambda code, **kwargs: f"Explanation of code:\n{code}\n\nThis code appears to be {detect_language(code)} and it likely does the following...",
        "optimize": lambda code, **kwargs: f"Optimized version:\n{code}\n\n// Optimized for better performance",
        "debug": lambda code, **kwargs: f"Debugging suggestions:\n{code}\n\n1. Check for potential issues in line X\n2. Consider error handling"
    },
    "creative": {
        "story": lambda prompt, **kwargs: f"Once upon a time, inspired by '{prompt}'...",
        "poem": lambda prompt, **kwargs: f"Poem about {prompt}:\n\nVerse 1\nCreative lines about {prompt}\nMore creative content\n\nVerse 2\nFurther exploration of {prompt}",
        "ideas": lambda prompt, **kwargs: f"Ideas related to {prompt}:\n1. First creative concept\n2. Second innovative approach\n3. Third unique perspective"
    }
}

# Helper function to detect programming language
def detect_language(code):
    # Simple detection based on keywords or syntax
    if "def " in code and ":" in code:
        return "Python"
    elif "{" in code and "function" in code:
        return "JavaScript"
    elif "#include" in code:
        return "C/C++"
    elif "public class" in code:
        return "Java"
    else:
        return "unknown language"

@interpreter_bp.route('/interpret', methods=['POST'])
def interpret_content():
    """
    API endpoint for interpreting and generating content based on user input.
    
    Expected JSON payload:
    {
        "content_type": "text|code|creative",
        "operation": "operation_name",
        "input": "user input text",
        "options": {
            "option1": "value1",
            "option2": "value2"
        }
    }
    """
    try:
        data = request.get_json()
        
        # Validate required fields
        if not all(key in data for key in ['content_type', 'operation', 'input']):
            return jsonify({
                'success': False,
                'error': 'Missing required fields. Please provide content_type, operation, and input.'
            }), 400
        
        content_type = data['content_type']
        operation = data['operation']
        user_input = data['input']
        options = data.get('options', {})
        
        # Check if content type and operation are valid
        if content_type not in content_models:
            return jsonify({
                'success': False,
                'error': f'Invalid content type. Supported types: {", ".join(content_models.keys())}'
            }), 400
        
        if operation not in content_models[content_type]:
            return jsonify({
                'success': False,
                'error': f'Invalid operation for {content_type}. Supported operations: {", ".join(content_models[content_type].keys())}'
            }), 400
        
        # Process the content using the appropriate model
        result = content_models[content_type][operation](user_input, **options)
        
        # Return the processed content
        return jsonify({
            'success': True,
            'content_type': content_type,
            'operation': operation,
            'input': user_input,
            'result': result,
            'options_applied': options
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'An error occurred: {str(e)}'
        }), 500

@interpreter_bp.route('/operations', methods=['GET'])
def get_available_operations():
    """
    API endpoint to retrieve all available content types and their operations.
    """
    operations = {}
    
    for content_type, ops in content_models.items():
        operations[content_type] = list(ops.keys())
    
    return jsonify({
        'success': True,
        'available_operations': operations
    })

@interpreter_bp.route('/analyze', methods=['POST'])
def analyze_content():
    """
    API endpoint for analyzing content to provide insights.
    
    Expected JSON payload:
    {
        "content": "text to analyze"
    }
    """
    try:
        data = request.get_json()
        
        if 'content' not in data:
            return jsonify({
                'success': False,
                'error': 'Missing required field: content'
            }), 400
        
        content = data['content']
        
        # Perform basic content analysis
        analysis = {
            'length': len(content),
            'word_count': len(content.split()),
            'sentence_count': content.count('.') + content.count('!') + content.count('?'),
            'complexity': 'simple' if len(content) < 100 else 'moderate' if len(content) < 500 else 'complex',
            'potential_content_type': detect_content_type(content)
        }
        
        return jsonify({
            'success': True,
            'analysis': analysis
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'An error occurred: {str(e)}'
        }), 500

def detect_content_type(content):
    """Helper function to detect the type of content provided."""
    # Simple heuristic detection
    if '```' in content or 'function' in content or 'def ' in content or '{' in content:
        return 'code'
    elif len(content.split()) < 20 and ('?' in content or content.startswith('Write') or content.startswith('Create')):
        return 'creative'
    else:
        return 'text'
