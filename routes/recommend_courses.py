from flask import request, jsonify, Blueprint
import os
from models.course_recommendation import CourseRecommendation

recommend_courses_bp = Blueprint('recommend_courses', __name__)

@recommend_courses_bp.route("/recommend-courses", methods=["GET"])
def recommend_courses():
    filename = request.args.get('filename')
    if not filename:
        return jsonify({"error": "No filename provided"}), 400
        
    json_filename = f"{filename}.json"
    resume_path = os.path.join(os.getcwd(), "uploads", json_filename)
    
    if not os.path.exists(resume_path):
        return jsonify({"error": f"Parsed resume data for {filename} not found"}), 404
        
    try:
        recommender = CourseRecommendation(
            resume_path=resume_path,
            preds_path=os.path.join(os.getcwd(), "uploads", f"{filename}_similar_courses.json")
        )
        course_data, courses = recommender.get_data()
        similar_courses_dict = recommender.create_course_list(courses)
        
        recommended = []
        for orig, list_rec in similar_courses_dict.items():
            for rec in list_rec:
                if rec not in recommended:
                    recommended.append(rec)
                    
        return jsonify({"courses": recommended[:8]})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
