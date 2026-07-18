from flask import request, jsonify, Blueprint

import sys
sys.path.append("..") # Adds higher directory to python modules path.

from models.get_ats_recommendation import load_json_file , ats_recommendations

ats_recommendations_bp = Blueprint('ats_recommendations', __name__)


import os

@ats_recommendations_bp.route('/ats-recommendations', methods=['GET'])
def get_recommendations():
    filename = request.args.get('filename')
    if not filename:
        return jsonify({"error": "No filename provided"}), 400
        
    json_filename = f"{filename}.json"
    file_path = os.path.join(os.getcwd(), "uploads", json_filename)
    
    if not os.path.exists(file_path):
        return jsonify({"error": f"Parsed resume data for {filename} not found"}), 404
        
    try:
        json_data = load_json_file(file_path)
        recommendations = ats_recommendations(json_data)
        recommendations_json = jsonify({'suggestions' : recommendations})
        return recommendations_json
    except Exception as e:
        return jsonify({"error": str(e)}), 500