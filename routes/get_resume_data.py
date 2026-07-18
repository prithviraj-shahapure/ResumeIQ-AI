from flask import request, jsonify, Blueprint

get_resume_data_bp = Blueprint('get_resume_data', __name__)


import os
import json

import os
import json
import sys
# Make sure the models directory is importable
sys.path.append(os.getcwd())
from models.Identify_user_domain import suggest_professions

@get_resume_data_bp.route("/get-resume-data", methods=["GET"])
def get_resume_data():
    filename = request.args.get('filename')
    if not filename:
        return jsonify({"error": "No filename provided"}), 400
        
    json_filename = f"{filename}.json"
    path = os.path.join(os.getcwd(), "uploads", json_filename)
    
    if not os.path.exists(path):
        return jsonify({"error": f"Parsed resume data for {filename} not found"}), 404
        
    try:
        with open(path, "r") as f:
            data = json.load(f)
            
        # Get category/professions using the Identify_user_domain model
        skills = data.get("filename", {}).get("skills", [])
        lowercase_skills = [s.lower() for s in skills]
        categories = suggest_professions(lowercase_skills)
        
        # Append the category info to the response
        data["category"] = categories[0] if categories else "Software Engineer"
        data["categories"] = categories
        
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
