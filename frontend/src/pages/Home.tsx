import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, Sparkles, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

interface HomeProps {
  onUploadSuccess: (filename: string, extractedData: any) => void;
}

export const Home: React.FC<HomeProps> = ({ onUploadSuccess }) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await processFile(e.target.files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const processFile = async (file: File) => {
    const validTypes = [
      'application/pdf', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
      'application/msword' // doc
    ];
    
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    
    if (!validTypes.includes(file.type) && fileExt !== 'pdf' && fileExt !== 'docx') {
      setError('Unsupported file type. Please upload a PDF or DOCX file.');
      return;
    }

    setError(null);
    setUploadProgress(0);
    setIsProcessing(false);

    try {
      // 1. Upload file and parse base data
      const result = await api.uploadResume(file, (progress) => {
        setUploadProgress(progress);
        if (progress === 100) {
          setIsProcessing(true);
        }
      });

      if (result.success) {
        onUploadSuccess(result.filename, result.data);
      } else {
        throw new Error('Parsing returned unsuccessful status');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during upload. Please try again.');
      setUploadProgress(null);
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full filter blur-[100px] pulse-glow"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full filter blur-[100px] pulse-glow" style={{ animationDelay: '-4s' }}></div>

      <div className="text-center max-w-3xl mb-12 relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-panel text-sm font-semibold text-purple-400 mb-6 border border-purple-500/20">
          <Sparkles className="w-4 h-4" />
          <span>Next-Generation Resume Evaluation</span>
        </div>
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-6 bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
          AI Resume Screener
        </h1>
        <p className="text-lg md:text-xl text-slate-400 dark:text-slate-400 light:text-slate-600 leading-relaxed font-light">
          Analyze your resume, calculate ATS score, identify missing skills, and receive personalized recommendations.
        </p>
      </div>

      <div className="w-full max-w-xl relative z-10">
        {/* Upload card */}
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={uploadProgress === null ? triggerFileInput : undefined}
          className={`glass-card p-10 rounded-3xl border-2 border-dashed flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 ${
            isDragActive 
              ? 'border-purple-500 bg-purple-500/5 scale-[1.02]' 
              : 'border-slate-800 dark:border-slate-800 light:border-slate-200 hover:border-purple-500/50'
          } ${uploadProgress !== null ? 'pointer-events-none' : ''}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileChange}
            accept=".pdf,.docx"
          />

          {uploadProgress === null ? (
            <>
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-purple-500/10 flex items-center justify-center mb-6 hover:scale-110 transition-transform duration-300">
                <UploadCloud className="w-10 h-10 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold mb-2">Drag & Drop Resume</h3>
              <p className="text-slate-400 dark:text-slate-400 light:text-slate-500 text-sm mb-6 max-w-xs">
                Upload your file to get evaluated against industry standards
              </p>
              <button 
                type="button" 
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold transition-all shadow-lg shadow-purple-500/20 active:scale-95"
              >
                Browse Files
              </button>
              <div className="flex gap-4 mt-8 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> PDF format
                </span>
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> DOCX format
                </span>
              </div>
            </>
          ) : (
            <div className="w-full py-8">
              {!isProcessing ? (
                <>
                  <UploadCloud className="w-14 h-14 text-purple-400 animate-bounce mx-auto mb-6" />
                  <h3 className="text-xl font-bold mb-2">Uploading your resume...</h3>
                  <div className="w-full bg-slate-800 rounded-full h-2.5 max-w-sm mx-auto mb-3 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-purple-600 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                  <span className="text-purple-400 text-sm font-semibold">{uploadProgress}% uploaded</span>
                </>
              ) : (
                <>
                  <div className="relative w-20 h-20 mx-auto mb-6">
                    {/* Ring loader */}
                    <div className="absolute inset-0 rounded-full border-4 border-slate-800"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-purple-500 border-t-transparent animate-spin"></div>
                    <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-purple-400 animate-pulse" />
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 animate-pulse">
                    Parsing Resume Elements
                  </h3>
                  <p className="text-slate-400 text-sm max-w-xs mx-auto animate-pulse">
                    Our AI models are extracting structure, matching skills, and compiling recommendations...
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 p-4 rounded-xl bg-red-950/20 border border-red-500/20 text-red-400 text-sm flex items-start gap-3 glass-panel">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}
      </div>
    </div>
  );
};
