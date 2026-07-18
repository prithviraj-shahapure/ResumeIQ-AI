import React, { useEffect, useState } from 'react';
import { 
  ArrowLeft, CheckCircle2, AlertTriangle, TrendingUp, Download, Copy, Sparkles, 
  BookOpen, Award, Check, X, RefreshCw, ChevronRight, AlertCircle, CopyCheck
} from 'lucide-react';
import { motion } from 'framer-motion';
import { 
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip
} from 'recharts';
import { api } from '../services/api';
import type { ResumeData, AtsRecommendations, CourseRecommendations, SkillRecommendations, SectionScore } from '../services/api';

interface DashboardProps {
  filename: string;
  onBack: () => void;
}

// Top industries matching skills (used in the frontend for skill matching comparison)
const INDUSTRY_REQUIREMENTS: Record<string, string[]> = {
  "Software Developer": ["python", "java", "javascript", "c++", "web development", "git", "sql"],
  "Data Scientist": ["python", "data science", "machine learning", "data analysis", "sql", "numpy", "pandas"],
  "DevOps Engineer": ["devops", "cloud computing", "docker", "kubernetes", "linux", "aws", "git"],
  "UI/UX Designer": ["ui design", "ux design", "user research", "wireframing", "prototyping", "figma", "css"],
  "Business Analyst": ["business analysis", "requirements gathering", "process modeling", "sql", "jira", "agile"],
  "Product Manager": ["product management", "product strategy", "market research", "agile", "scrum", "jira"]
};

export const Dashboard: React.FC<DashboardProps> = ({ filename, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // API states
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [atsRecs, setAtsRecs] = useState<AtsRecommendations | null>(null);
  const [courseRecs, setCourseRecs] = useState<CourseRecommendations | null>(null);
  const [skillRecs, setSkillRecs] = useState<SkillRecommendations | null>(null);
  const [sectionScore, setSectionScore] = useState<SectionScore | null>(null);

  // Tab State
  const [activeTab, setActiveTab] = useState<'overview' | 'skills' | 'improvement'>('overview');

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [data, ats, courses, skills, section] = await Promise.all([
          api.getResumeData(filename),
          api.getAtsRecommendations(filename),
          api.getRecommendedCourses(filename),
          api.getRecommendedSkills(filename),
          api.getOverallScore(filename)
        ]);

        setResumeData(data);
        setAtsRecs(ats);
        setCourseRecs(courses);
        setSkillRecs(skills);
        setSectionScore(section);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Failed to load analysis data. Please check your backend.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [filename]);

  // Math calculations for the dashboard
  const getDashboardMetrics = () => {
    if (!resumeData || !atsRecs || !sectionScore) return null;

    const detectedSkills = resumeData.filename.skills || [];
    const resumeSectionScore = sectionScore.resume_score || 0; // Out of 100
    const recommendationsCount = atsRecs.suggestions.length || 0;

    // 1. Formatting Score (Starts at 100, drops 15pts per recommendation, minimum 10)
    const formattingScore = Math.max(10, 100 - recommendationsCount * 15);

    // 2. Skill Richness Score (5 points per skill, max 100 for 20+ skills)
    const skillRichnessScore = Math.min(100, detectedSkills.length * 5);

    // 3. Overall ATS Score (weighted combination: 45% section completeness, 35% formatting, 20% skill depth)
    const overallScore = Math.round(
      (resumeSectionScore * 0.45) + (formattingScore * 0.35) + (skillRichnessScore * 0.20)
    );

    // 4. Strengths & Weaknesses
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    const totalExp = resumeData.filename.total_experience || 0;
    if (totalExp > 2) {
      strengths.push(`Proven professional experience (${totalExp} years)`);
    } else if (totalExp > 0) {
      strengths.push(`Active work experience (${totalExp} year${totalExp > 1 ? 's' : ''})`);
    } else {
      weaknesses.push('No professional work experience listed');
    }

    if (detectedSkills.length > 12) {
      strengths.push(`Rich skill profile (${detectedSkills.length} skills parsed)`);
    } else if (detectedSkills.length < 6) {
      weaknesses.push(`Thin skill profile (${detectedSkills.length} skills listed). Consider expanding.`);
    }

    if (resumeData.filename.degree && resumeData.filename.degree.length > 0) {
      strengths.push(`Higher education credentials: ${resumeData.filename.degree[0]}`);
    } else {
      weaknesses.push('No degrees or educational credentials detected');
    }

    if (sectionScore.sections['Projects'] && resumeData.filename.skills?.length > 0) {
      strengths.push('Projects section present to demonstrate applied knowledge');
    } else if (!sectionScore.sections['Projects']) {
      weaknesses.push('Missing Projects section. Consider adding academic/personal projects.');
    }

    if (!sectionScore.sections['Certifications']) {
      weaknesses.push('No Certifications found. Industry credentials can improve trust.');
    } else {
      strengths.push('Certifications listed to validate specialized training');
    }

    return {
      overallScore,
      resumeSectionScore,
      formattingScore,
      skillRichnessScore,
      strengths,
      weaknesses
    };
  };

  const getSkillMatchData = () => {
    if (!resumeData) return [];

    const userSkills = (resumeData.filename.skills || []).map(s => s.toLowerCase());
    
    return Object.entries(INDUSTRY_REQUIREMENTS).map(([industry, requiredSkills]) => {
      const intersection = requiredSkills.filter(skill => 
        userSkills.some(userSkill => userSkill.includes(skill) || skill.includes(userSkill))
      );
      const matchPercent = Math.round((intersection.length / requiredSkills.length) * 100);
      return {
        name: industry,
        match: matchPercent
      };
    }).sort((a, b) => b.match - a.match);
  };

  const handleCopySuggestions = () => {
    if (!atsRecs) return;
    const text = atsRecs.suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <RefreshCw className="w-12 h-12 text-purple-500 animate-spin mb-4" />
        <h3 className="text-xl font-bold">Compiling Report</h3>
        <p className="text-slate-400 text-sm">Querying backend scoring models...</p>
      </div>
    );
  }

  if (error || !resumeData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-lg mx-auto text-center px-4">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4 animate-pulse" />
        <h3 className="text-2xl font-bold text-red-400 mb-2">Analysis Failed</h3>
        <p className="text-slate-400 mb-6">{error || 'An unexpected error occurred.'}</p>
        <button 
          onClick={onBack}
          className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium flex items-center gap-2 transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Upload
        </button>
      </div>
    );
  }

  const metrics = getDashboardMetrics();
  const skillMatchData = getSkillMatchData();

  // Pie chart data
  const pieData = [
    { name: 'Sections', value: metrics?.resumeSectionScore || 0, color: '#3b82f6' },
    { name: 'Format', value: metrics?.formattingScore || 0, color: '#8b5cf6' },
    { name: 'Skills Depth', value: metrics?.skillRichnessScore || 0, color: '#ec4899' },
  ];

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8 relative">
      {/* Header section (Non-Printable) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 no-print">
        <button 
          onClick={onBack}
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors py-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Upload another resume</span>
        </button>

        <div className="flex items-center gap-3">
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold transition-all text-sm border border-slate-700/50"
          >
            <Download className="w-4 h-4" />
            <span>Download PDF Report</span>
          </button>
        </div>
      </div>

      {/* Printable Resume Header Info */}
      <div className="glass-panel p-6 rounded-3xl mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-l-4 border-l-purple-500">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 text-xs font-semibold mb-3 border border-purple-500/15">
            <Sparkles className="w-3 h-3" />
            <span>Parsed Candidate Category: {resumeData.category}</span>
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight">
            {resumeData.filename.name || 'Candidate Profile'}
          </h2>
          <div className="flex flex-wrap gap-x-6 gap-y-2 mt-3 text-sm text-slate-400">
            {resumeData.filename.email && <span>{resumeData.filename.email}</span>}
            {resumeData.filename.mobile_number && <span>{resumeData.filename.mobile_number}</span>}
            {resumeData.filename.no_of_pages && <span>Pages: {resumeData.filename.no_of_pages}</span>}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Circular ATS Gauge */}
          <div className="relative w-28 h-28 flex items-center justify-center">
            {/* SVG circle track */}
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle 
                cx="50" cy="50" r="40" 
                className="stroke-slate-800 light:stroke-slate-200 fill-none" 
                strokeWidth="8"
              />
              <motion.circle 
                cx="50" cy="50" r="40" 
                className="stroke-purple-500 fill-none" 
                strokeWidth="8"
                strokeDasharray="251.2"
                initial={{ strokeDashoffset: 251.2 }}
                animate={{ strokeDashoffset: 251.2 - (251.2 * (metrics?.overallScore || 0)) / 100 }}
                transition={{ duration: 1.5, ease: "easeOut" }}
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-3xl font-extrabold text-white dark:text-white light:text-slate-900 leading-none">
                {metrics?.overallScore}%
              </span>
              <span className="text-[10px] text-slate-400 font-semibold mt-1">ATS Match</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs (Non-Printable) */}
      <div className="flex border-b border-slate-800 dark:border-slate-800 light:border-slate-200 mb-8 no-print">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-5 py-3 font-semibold text-sm transition-all border-b-2 ${
            activeTab === 'overview' 
              ? 'border-purple-500 text-purple-400' 
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Analysis Overview
        </button>
        <button
          onClick={() => setActiveTab('skills')}
          className={`px-5 py-3 font-semibold text-sm transition-all border-b-2 ${
            activeTab === 'skills' 
              ? 'border-purple-500 text-purple-400' 
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Skill Match & Courses
        </button>
        <button
          onClick={() => setActiveTab('improvement')}
          className={`px-5 py-3 font-semibold text-sm transition-all border-b-2 ${
            activeTab === 'improvement' 
              ? 'border-purple-500 text-purple-400' 
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Improvement Suggestions ({atsRecs?.suggestions.length})
        </button>
      </div>

      {/* Dashboard Content */}
      <div className="grid grid-cols-1 gap-8">
        
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {/* Visual Charts Card */}
            <div className="glass-card p-6 rounded-3xl md:col-span-2 flex flex-col min-h-[350px]">
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-bold">ATS Score Breakdown</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center flex-grow">
                {/* Pie Chart Representation */}
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value}/100`, 'Score']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Legends and Metrics */}
                <div className="space-y-4">
                  {pieData.map((item, idx) => (
                    <div key={idx} className="flex flex-col justify-center">
                      <div className="flex items-center justify-between text-sm mb-1.5">
                        <span className="flex items-center gap-2 text-slate-400 font-medium">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></span>
                          {item.name}
                        </span>
                        <span className="font-bold">{item.value}%</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div className="h-1.5 rounded-full" style={{ backgroundColor: item.color, width: `${item.value}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Resume Score Checklist */}
            <div className="glass-card p-6 rounded-3xl flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold">Section Completeness</h3>
                  <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 text-xs font-bold border border-blue-500/20">
                    Score: {sectionScore?.resume_score}/100
                  </span>
                </div>
                <div className="space-y-3.5 max-h-[260px] overflow-y-auto pr-1">
                  {sectionScore && Object.entries(sectionScore.sections).map(([section, present], idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span className={`${present ? 'text-slate-300 dark:text-slate-300 light:text-slate-700' : 'text-slate-500 dark:text-slate-500 light:text-slate-400 line-through'}`}>
                        {section}
                      </span>
                      {present ? (
                        <span className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                          <Check className="w-3 h-3 text-emerald-400" />
                        </span>
                      ) : (
                        <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center">
                          <X className="w-3 h-3 text-slate-600" />
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Strengths Card */}
            <div className="glass-card p-6 rounded-3xl border-t-4 border-t-emerald-500">
              <div className="flex items-center gap-2 text-emerald-400 mb-4 font-bold text-lg">
                <CheckCircle2 className="w-5 h-5" />
                <h3>Resume Strengths</h3>
              </div>
              <ul className="space-y-3.5">
                {metrics?.strengths.map((str, idx) => (
                  <li key={idx} className="text-sm flex items-start gap-2 text-slate-300 dark:text-slate-300 light:text-slate-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 flex-shrink-0" />
                    <span>{str}</span>
                  </li>
                ))}
                {metrics?.strengths.length === 0 && (
                  <p className="text-sm text-slate-500 italic">No major strengths found.</p>
                )}
              </ul>
            </div>

            {/* Weaknesses Card */}
            <div className="glass-card p-6 rounded-3xl border-t-4 border-t-amber-500">
              <div className="flex items-center gap-2 text-amber-400 mb-4 font-bold text-lg">
                <AlertTriangle className="w-5 h-5" />
                <h3>Critical Weaknesses</h3>
              </div>
              <ul className="space-y-3.5">
                {metrics?.weaknesses.map((weak, idx) => (
                  <li key={idx} className="text-sm flex items-start gap-2 text-slate-300 dark:text-slate-300 light:text-slate-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 flex-shrink-0" />
                    <span>{weak}</span>
                  </li>
                ))}
                {metrics?.weaknesses.length === 0 && (
                  <p className="text-sm text-emerald-400 italic">Excellent! No major issues detected.</p>
                )}
              </ul>
            </div>

            {/* Domain & Target Matching Card */}
            <div className="glass-card p-6 rounded-3xl border-t-4 border-t-purple-500">
              <div className="flex items-center gap-2 text-purple-400 mb-4 font-bold text-lg">
                <TrendingUp className="w-5 h-5" />
                <h3>Matched Profession</h3>
              </div>
              <p className="text-sm text-slate-400 mb-4">
                Based on your skills, you have matching qualifications for:
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                {resumeData.categories?.map((cat, idx) => (
                  <span key={idx} className="px-2.5 py-1 text-xs rounded-lg bg-purple-500/10 text-purple-400 font-semibold border border-purple-500/15">
                    {cat}
                  </span>
                ))}
              </div>
              <p className="text-xs text-slate-500 italic">
                Your highest matching field is <strong className="text-purple-400">{resumeData.category}</strong>. Check out specific recommendations under skills tab.
              </p>
            </div>
          </motion.div>
        )}

        {/* TAB 2: SKILLS & COURSES */}
        {activeTab === 'skills' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-8"
          >
            {/* Skills Radar / Bar Chart Match */}
            <div className="glass-card p-6 rounded-3xl">
              <h3 className="text-lg font-bold mb-6">Top Industry Skill Match %</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={skillMatchData} layout="vertical" margin={{ left: 20 }}>
                    <XAxis type="number" domain={[0, 100]} stroke="#475569" />
                    <YAxis dataKey="name" type="category" stroke="#475569" width={110} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value) => [`${value}%`, 'Match Rate']} />
                    <Bar dataKey="match" fill="#8b5cf6" radius={[0, 4, 4, 0]}>
                      {skillMatchData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#8b5cf6' : '#3b82f6'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Skills Detected / Missing */}
            <div className="glass-card p-6 rounded-3xl flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5 text-purple-400" />
                  Skills Detected ({resumeData.filename.skills?.length || 0})
                </h3>
                <div className="flex flex-wrap gap-2 max-h-[140px] overflow-y-auto pr-1 mb-6">
                  {resumeData.filename.skills?.map((skill, idx) => (
                    <span 
                      key={idx} 
                      className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 text-slate-300 border border-slate-700/50 hover:bg-slate-700 transition-colors"
                    >
                      {skill}
                    </span>
                  ))}
                  {(!resumeData.filename.skills || resumeData.filename.skills.length === 0) && (
                    <p className="text-sm text-slate-500 italic">No skills detected. Expand your profile.</p>
                  )}
                </div>

                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-pink-400" />
                  Recommended Skills (Missing)
                </h3>
                <div className="flex flex-wrap gap-2 max-h-[120px] overflow-y-auto pr-1">
                  {skillRecs?.skills?.map((skill, idx) => (
                    <span 
                      key={idx} 
                      className="px-2.5 py-1 text-xs rounded-lg bg-pink-500/10 text-pink-400 font-semibold border border-pink-500/15"
                    >
                      + {skill}
                    </span>
                  ))}
                  {(!skillRecs?.skills || skillRecs.skills.length === 0) && (
                    <p className="text-sm text-slate-500 italic">No recommendations. Skill profile is complete.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Course Recommendations */}
            <div className="glass-card p-6 rounded-3xl md:col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <BookOpen className="w-5 h-5 text-blue-400" />
                <h3 className="text-lg font-bold">Recommended Courses for Professional Growth</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {courseRecs?.courses?.map((course, idx) => (
                  <a 
                    key={idx}
                    href={`https://www.coursera.org/search?query=${encodeURIComponent(course)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-4 rounded-2xl bg-slate-900/40 hover:bg-slate-900/80 border border-slate-800/80 hover:border-blue-500/35 transition-all flex justify-between items-center group cursor-pointer"
                  >
                    <div>
                      <h4 className="font-semibold text-sm text-slate-200 group-hover:text-white capitalize transition-colors">
                        {course}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">Platform Recommendation • Udemy / Coursera</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-blue-400 group-hover:translate-x-1 transition-all flex-shrink-0" />
                  </a>
                ))}
                {(!courseRecs?.courses || courseRecs.courses.length === 0) && (
                  <p className="text-sm text-slate-500 italic p-4">No course recommendations available.</p>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 3: SUGGESTIONS */}
        {activeTab === 'improvement' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6 rounded-3xl"
          >
            <div className="flex items-center justify-between gap-4 mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                Suggestions for ATS Optimization
              </h3>
              <button
                onClick={handleCopySuggestions}
                className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/50 transition-all font-semibold"
              >
                {copied ? (
                  <>
                    <CopyCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy All</span>
                  </>
                )}
              </button>
            </div>

            <div className="space-y-4">
              {atsRecs?.suggestions?.map((rec, idx) => (
                <div 
                  key={idx} 
                  className="p-5 rounded-2xl bg-slate-900/50 border border-slate-850 hover:border-purple-500/20 transition-all flex items-start gap-4"
                >
                  <div className="w-7 h-7 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400 font-bold text-xs flex-shrink-0 border border-purple-500/20 mt-0.5">
                    {idx + 1}
                  </div>
                  <div>
                    <p className="text-slate-300 dark:text-slate-300 light:text-slate-800 text-sm leading-relaxed">
                      {rec}
                    </p>
                  </div>
                </div>
              ))}
              {(!atsRecs?.suggestions || atsRecs.suggestions.length === 0) && (
                <p className="text-emerald-400 italic text-center py-10">
                  Your resume is fully optimized according to standard ATS criteria!
                </p>
              )}
            </div>
          </motion.div>
        )}

      </div>
    </div>
  );
};
