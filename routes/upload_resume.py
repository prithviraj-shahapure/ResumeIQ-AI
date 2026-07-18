from flask import Blueprint, jsonify, request
import os
import re
import json

# Try to download nltk stopwords
import nltk
try:
    nltk.download('stopwords')
except:
    pass

upload_resume_bp = Blueprint('upload_resume', __name__)

def extract_text_from_pdf(pdf_path):
    import PyPDF2
    text = ""
    try:
        with open(pdf_path, 'rb') as f:
            reader = PyPDF2.PdfReader(f)
            for page in reader.pages:
                t = page.extract_text()
                if t:
                    text += t + "\n"
    except Exception as e:
        print(f"Error reading PDF: {e}")
    return text

def extract_text_from_docx(docx_path):
    import docx2txt
    try:
        return docx2txt.process(docx_path)
    except Exception as e:
        print(f"Error reading DOCX: {e}")
        return ""

def custom_resume_parser(file_path):
    ext = os.path.splitext(file_path)[1].lower()
    if ext == '.pdf':
        text = extract_text_from_pdf(file_path)
    elif ext == '.docx':
        text = extract_text_from_docx(file_path)
    else:
        text = ""
        
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    
    # 1. Name: default to first line of text or clean candidate name
    name = "Candidate Profile"
    if lines:
        for line in lines[:5]:
            if "@" not in line and not re.search(r'\d{5,}', line) and len(line) < 40 and not line.lower().startswith('http'):
                # Avoid standard section headers
                if not any(header in line.upper() for header in ['EDUCATION', 'EXPERIENCE', 'SKILLS', 'PROJECTS', 'CONTACT']):
                    name = line
                    break
                
    # 2. Email
    email_pattern = r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+'
    emails = re.findall(email_pattern, text)
    email = emails[0] if emails else None
    
    # 3. Mobile Number
    mobile_pattern = r'(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}'
    mobiles = re.findall(mobile_pattern, text)
    mobile = mobiles[0] if mobiles else None
    
    # 4. Skills: Check against the local skills dataset list
    detected_skills = []
    try:
        from data.model_data.dataset.skill_recommendation.skills import skills_list
        text_lower = text.lower()
        for skill in skills_list:
            pattern = r'\b' + re.escape(skill.lower()) + r'\b'
            if re.search(pattern, text_lower):
                detected_skills.append(skill)
    except Exception as e:
        print(f"Error loading skills list: {e}")
        # Small fallback skills list
        fallback_skills = ["Python", "Java", "C++", "SQL", "JavaScript", "React", "Flask", "Docker", "Git", "HTML", "CSS"]
        text_lower = text.lower()
        for skill in fallback_skills:
            if skill.lower() in text_lower:
                detected_skills.append(skill)
            
    # 5. College Name
    college_keywords = ["college", "university", "institute", "school", "academy"]
    colleges = []
    for line in lines:
        if any(kw in line.lower() for kw in college_keywords) and len(line) < 100:
            colleges.append(line)
    college_name = colleges[0] if colleges else None
    
    # 6. Degree
    degree_keywords = ["b.tech", "m.tech", "b.e", "b.s", "bachelor", "master", "ph.d", "bca", "mca", "diploma", "mba"]
    degrees = []
    for line in lines:
        for dk in degree_keywords:
            if re.search(r'\b' + re.escape(dk) + r'\b', line.lower()):
                degrees.append(line)
                break
    degree = degrees if degrees else None
    
    # 7. Designation
    designation_keywords = ["developer", "engineer", "analyst", "manager", "intern", "specialist", "administrator", "lead", "architect", "designer"]
    designations = []
    for line in lines:
        for dk in designation_keywords:
            if re.search(r'\b' + re.escape(dk) + r'\b', line.lower()) and "experience" not in line.lower() and "skills" not in line.lower():
                designations.append(line)
                break
    designation = designations if designations else None
    
    # 8. Company names
    company_keywords = ["google", "microsoft", "amazon", "facebook", "meta", "tcs", "infosys", "wipro", "cognizant", "accenture", "ibm", "apple", "netflix"]
    companies = []
    for line in lines:
        for ck in company_keywords:
            if re.search(r'\b' + re.escape(ck) + r'\b', line.lower()):
                companies.append(ck.capitalize())
    company_names = list(set(companies)) if companies else None
    
    # 9. Total Experience
    total_experience = 0.0
    exp_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:years?|yrs?)\s+(?:of\s+)?experience', text_lower)
    if exp_match:
        total_experience = float(exp_match.group(1))
    else:
        exp_range = re.findall(r'\b(19\d{2}|20\d{2})\s*[-–—]\s*(current|present|20\d{2})\b', text_lower)
        if exp_range:
            total_exp = 0.0
            for start, end in exp_range:
                start_year = int(start)
                end_year = 2026 if end in ['current', 'present'] else int(end)
                total_exp += max(0, end_year - start_year)
            total_experience = total_exp
            
    # 10. Number of pages
    no_of_pages = 1
    if ext == '.pdf':
        try:
            import PyPDF2
            with open(file_path, 'rb') as f:
                reader = PyPDF2.PdfReader(f)
                no_of_pages = len(reader.pages)
        except:
            pass
            
    return {
        'name': name,
        'email': email,
        'mobile_number': mobile,
        'skills': detected_skills,
        'college_name': college_name,
        'degree': degree,
        'designation': designation,
        'experience': None,
        'company_names': company_names,
        'no_of_pages': no_of_pages,
        'total_experience': total_experience,
    }

@upload_resume_bp.route("/upload-resume", methods=["POST"])
def upload_resume():
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
        
    uploads_dir = os.path.join(os.getcwd(), "uploads")
    os.makedirs(uploads_dir, exist_ok=True)
    
    path = os.path.join(uploads_dir, file.filename)
    file.save(path)
    
    # Try parsing using ResumeParser, fall back to custom_resume_parser on any error
    try:
        from pyresparser import ResumeParser
        data = ResumeParser(path).get_extracted_data()
        
        # Verify that data was successfully extracted, otherwise trigger fallback
        if not data or not data.get('skills'):
            raise Exception("pyresparser returned empty or incomplete data")
    except Exception as e:
        print(f"pyresparser failed: {e}. Running fallback custom parser...")
        data = custom_resume_parser(path)
        
    # Save JSON output for downstream models to use
    json_filename = f"{file.filename}.json"
    json_path = os.path.join(uploads_dir, json_filename)
    
    try:
        with open(json_path, "w") as f:
            json.dump({"filename": data}, f, indent=4)
            
        return jsonify({
            "success": True,
            "filename": file.filename,
            "data": data
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
