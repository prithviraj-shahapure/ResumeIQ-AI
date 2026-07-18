from flask import request, jsonify, Blueprint
import os
from models.skill_recommendation import SkillRecommendation

recommend_skills_bp = Blueprint('recommend_skills', __name__)

@recommend_skills_bp.route("/recommend-skills", methods=["GET"])
def recommend_skills():
    filename = request.args.get('filename')
    if not filename:
        return jsonify({"error": "No filename provided"}), 400
        
    json_filename = f"{filename}.json"
    resume_path = os.path.join(os.getcwd(), "uploads", json_filename)
    
    if not os.path.exists(resume_path):
        return jsonify({"error": f"Parsed resume data for {filename} not found"}), 404
        
    try:
        recommender = SkillRecommendation(
            resume_path=resume_path,
            preds_path=os.path.join(os.getcwd(), "uploads", f"{filename}_similar_skills.json")
        )
        skills, description, project_skills = recommender.get_data()
        similar_skills_dict = recommender.create_skill_list(project_skills)
        
        recommended = []
        for orig, list_rec in similar_skills_dict.items():
            for rec in list_rec:
                if rec not in recommended and rec not in project_skills:
                    recommended.append(rec)
                    
        return jsonify({"skills": recommended[:8]})
    except Exception as e:
        return jsonify({"error": str(e)}), 500