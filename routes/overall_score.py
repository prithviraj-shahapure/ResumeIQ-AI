from flask import Flask,request,jsonify,Blueprint
import numpy as np
import nltk
nltk.download('stopwords')
import io
from pdfminer.converter import TextConverter
from pdfminer.layout import LAParams
from pdfminer.pdfinterp import PDFResourceManager, PDFPageInterpreter
from pdfminer.pdfpage import PDFPage

overall_score_bp = Blueprint('overall_score', __name__)

import os
import docx2txt

@overall_score_bp.route('/skills')
def skill_scorer():
    filename = request.args.get('filename')
    if not filename:
        return jsonify({"error": "No filename provided"}), 400
        
    path = os.path.join(os.getcwd(), "uploads", filename)
    if not os.path.exists(path):
        return jsonify({"error": f"Uploaded file {filename} not found"}), 404

    def pdf_reader(file):
        resource_manager = PDFResourceManager()
        fake_file_handle = io.StringIO()
        converter = TextConverter(resource_manager, fake_file_handle, laparams=LAParams())
        page_interpreter = PDFPageInterpreter(resource_manager, converter)
        with open(file, 'rb') as fh:
            for page in PDFPage.get_pages(fh,
                                        caching=True,
                                        check_extractable=True):
                page_interpreter.process_page(page)
            text = fake_file_handle.getvalue()
        return text

    try:
        if filename.lower().endswith('.pdf'):
            resume_text = pdf_reader(path)
        elif filename.lower().endswith('.docx'):
            resume_text = docx2txt.process(path)
        else:
            return jsonify({"error": "Unsupported file format. Only PDF and DOCX are supported."}), 400
            
        resume_score = 0
        sections = {}
        
        has_summary = 'Objective' in resume_text or 'Summary' in resume_text
        sections['Summary / Objective'] = has_summary
        if has_summary: resume_score += 6
    
        has_edu = 'Education' in resume_text or 'School' in resume_text or 'College' in resume_text
        sections['Education'] = has_edu
        if has_edu: resume_score += 12
    
        has_exp = 'EXPERIENCE' in resume_text or 'Experience' in resume_text
        sections['Work Experience'] = has_exp
        if has_exp: resume_score += 16
            
        has_intern = 'INTERNSHIPS' in resume_text or 'INTERNSHIP' in resume_text or 'Internships' in resume_text or 'Internship' in resume_text
        sections['Internships'] = has_intern
        if has_intern: resume_score += 6
       
        has_skills = 'SKILLS' in resume_text or 'SKILL' in resume_text or 'Skills' in resume_text or 'Skill' in resume_text
        sections['Skills'] = has_skills
        if has_skills: resume_score += 7
    
        has_hobbies = 'HOBBIES' in resume_text or 'Hobbies' in resume_text
        sections['Hobbies'] = has_hobbies
        if has_hobbies: resume_score += 4
    
        has_interests = 'INTERESTS' in resume_text or 'Interests' in resume_text
        sections['Interests'] = has_interests
        if has_interests: resume_score += 5
    
        has_achieve = 'ACHIEVEMENTS' in resume_text or 'Achievements' in resume_text
        sections['Achievements'] = has_achieve
        if has_achieve: resume_score += 13
    
        has_cert = 'CERTIFICATIONS' in resume_text or 'Certifications' in resume_text or 'Certification' in resume_text
        sections['Certifications'] = has_cert
        if has_cert: resume_score += 12
    
        has_proj = 'PROJECTS' in resume_text or 'PROJECT' in resume_text or 'Projects' in resume_text or 'Project' in resume_text
        sections['Projects'] = has_proj
        if has_proj: resume_score += 19
    
        skill_score = {
            'resume_score': resume_score,
            'sections': sections
        }
        return jsonify(skill_score)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    