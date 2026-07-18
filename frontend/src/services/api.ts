const BASE_URL = 'http://localhost:5000';

export interface ResumeDetails {
  college_name: string | null;
  company_names: string[] | null;
  degree: string[] | null;
  designation: string[] | null;
  email: string | null;
  experience: string[] | null;
  mobile_number: string | null;
  name: string | null;
  no_of_pages: number;
  skills: string[];
  total_experience: number;
}

export interface ResumeData {
  filename: ResumeDetails;
  category: string;
  categories: string[];
}

export interface AtsRecommendations {
  suggestions: string[];
}

export interface CourseRecommendations {
  courses: string[];
}

export interface SkillRecommendations {
  skills: string[];
}

export interface SectionScore {
  resume_score: number;
  sections: Record<string, boolean>;
}

export const api = {
  uploadResume(
    file: File,
    onProgress: (progress: number) => void
  ): Promise<{ success: boolean; filename: string; data: any }> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('file', file);

      xhr.open('POST', `${BASE_URL}/upload-resume`, true);

      // Track progress
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          onProgress(percentComplete);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (e) {
            reject(new Error('Invalid JSON response from server'));
          }
        } else {
          try {
            const errResponse = JSON.parse(xhr.responseText);
            reject(new Error(errResponse.error || `Upload failed with status ${xhr.status}`));
          } catch {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network error occurred during upload. Ensure the backend is running.'));
      };

      xhr.send(formData);
    });
  },

  async getResumeData(filename: string): Promise<ResumeData> {
    const res = await fetch(`${BASE_URL}/get-resume-data?filename=${encodeURIComponent(filename)}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch resume details');
    }
    return res.json();
  },

  async getOverallScore(filename: string): Promise<SectionScore> {
    const res = await fetch(`${BASE_URL}/skills?filename=${encodeURIComponent(filename)}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch overall score');
    }
    return res.json();
  },

  async getAtsRecommendations(filename: string): Promise<AtsRecommendations> {
    const res = await fetch(`${BASE_URL}/ats-recommendations?filename=${encodeURIComponent(filename)}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch ATS recommendations');
    }
    return res.json();
  },

  async getRecommendedCourses(filename: string): Promise<CourseRecommendations> {
    const res = await fetch(`${BASE_URL}/recommend-courses?filename=${encodeURIComponent(filename)}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch course recommendations');
    }
    return res.json();
  },

  async getRecommendedSkills(filename: string): Promise<SkillRecommendations> {
    const res = await fetch(`${BASE_URL}/recommend-skills?filename=${encodeURIComponent(filename)}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch skill recommendations');
    }
    return res.json();
  },
};
