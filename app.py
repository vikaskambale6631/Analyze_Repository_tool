from flask import Flask, request, jsonify, send_from_directory
import os
from repo_stats import get_repo_stats

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

    stats = get_repo_stats(repo_url, token)
    
    if "error" in stats:
        return jsonify({"error": stats["error"]}), 400
        
    return jsonify(stats)

if __name__ == '__main__':
    print("Server starting at http://127.0.0.1:5000")
    app.run(debug=True, port=5000)
