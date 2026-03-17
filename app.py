import os
from flask import Flask, request, jsonify, send_from_directory

app = Flask(__name__)

# Route to serve the frontend
@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

# Route to serve static files (CSS, JS)
@app.route('/<path:path>')
def static_files(path):
    return send_from_directory('.', path)

@app.route('/analyze', methods=['POST'])
def analyze():
    data = request.get_json()
    repo_url = data.get('repo_url')
    token = data.get('token')

    if not repo_url:
        return jsonify({"error": "Repository URL is required"}), 400

    import repo_stats
    import importlib
    importlib.reload(repo_stats) # Ensure it picks up changes
    
    stats = repo_stats.get_repo_stats(repo_url, token)
    
    if "error" in stats:
        return jsonify({"error": stats["error"]}), 400
        
    return jsonify(stats)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"Server starting on port {port}")
    app.run(host='0.0.0.0', port=port, debug=True)
