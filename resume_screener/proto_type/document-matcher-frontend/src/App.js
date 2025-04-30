import React, { useState } from "react";
import axios from "axios";
import * as pdfjsLib from "pdfjs-dist";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist"; 
import { ClipLoader } from "react-spinners";

// Configure PDF.js worker
GlobalWorkerOptions.workerSrc = "pdf.worker.min.mjs";  
const url = 'http://localhost:8000'
export default function App() {
  // Job state
  const [jobFile, setJobFile] = useState(null);
  const [jobLoading, setJobLoading] = useState(false);

  // Resumes state
  const [resumeFiles, setResumeFiles] = useState([]);
  const [uploadingIds, setUploadingIds] = useState(new Set());
  const [resumes, setResumes] = useState([]);

  // Ranking state
  const [ranking, setRanking] = useState(false);
  const [results, setResults] = useState([]);

  // Utility: extract text from a PDF file via PDF.js
  // Text extraction utility remains unchanged
  const extractText = async file => {
    const arrayBuffer = await new Response(file).arrayBuffer();                    // Read file
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;         // Load document
    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();                                 // Extract text
      text += content.items.map(item => item.str).join(" ") + "\n\n";
    }
    return text;
  };

  // Upload job description PDF
  const handleUploadJob = async () => {
    if (!jobFile) return;
    setJobLoading(true);
    const text = await extractText(jobFile);
    await axios.post("http://localhost:8000/job", { name: jobFile.name, text });
    setJobLoading(false);
  };

  // Upload multiple resume PDFs in parallel
  const handleUploadResumes = async () => {
    const ids = resumeFiles.map((_, i) => i);
    setUploadingIds(new Set(ids));
    
    try {
      await Promise.all(
        resumeFiles.map(async (file, idx) => {
          const text = await extractText(file);
          const response = await axios.post(url + "/resume", { name: file.name, text });
          
          // Use a unique identifier for each resume, ideally from the server response
          // If server doesn't provide an ID, generate a unique one using timestamp + random value
          const uniqueId = response.data?.id || Date.now() + Math.random().toString(36).substring(2, 9);
          
          setResumes(prev => [...prev, { name: file.name, idx: uniqueId }]);
          setUploadingIds(prev => {
            const next = new Set(prev);
            next.delete(idx);
            return next;
          });
        })
      );
    } catch (error) {
      console.error("Error uploading resumes:", error);
      // Handle upload error if needed
    }
  };

  // Trigger ranking
  const handleRank = async () => {
    setRanking(true);
    const resp = await axios.get(url + "/match");
    // Sort results from highest score to lowest score
    const sortedResults = [...resp.data.matches].sort((a, b) => b.score - a.score);
    setResults(sortedResults);
    setRanking(false);
  };

  // Delete single resume
  const handleDeleteResume = async (idx, name) => {
    try {
      await axios.delete(`${url}/resume/${idx}`);
      // Update local state to remove only the specific resume
      setResumes(prev => prev.filter(r => r.idx !== idx));
    } catch (error) {
      console.error("Error deleting resume:", error);
      // If the API call fails, you might want to show an error message
    }
  };

  // Delete job description
  const handleDeleteJob = async () => {
    await axios.delete(url + "/job");
    setJobFile(null);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8">
      {/* Job Section */}
      <section className="border p-4 rounded-lg space-y-2">
        <h2 className="text-xl font-semibold">Job Description</h2>
        <input
          type="file"
          accept="application/pdf"
          onChange={e => setJobFile(e.target.files[0])}
        />
        <button
          onClick={handleUploadJob}
          disabled={jobLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          {jobLoading
            ? <ClipLoader size={20} />   // Use ClipLoader spinner
            : "Upload Job"}
        </button>
        {jobFile && !jobLoading && (
          <button
            onClick={handleDeleteJob}
            className="ml-4 text-red-500 underline"
          >
            Delete Job
          </button>
        )}
      </section>

      {/* Resumes Section */}
      <section className="border p-4 rounded-lg space-y-2">
        <h2 className="text-xl font-semibold">Resumes</h2>
        <input
          type="file"
          accept="application/pdf"
          multiple
          onChange={e => setResumeFiles(Array.from(e.target.files))}
        />
        <button
          onClick={handleUploadResumes}
          className="px-4 py-2 bg-green-600 text-white rounded"
        >
          Upload Resumes
        </button>
        <ul className="mt-2 space-y-1">
          {Array.from(uploadingIds).map(id => (
            <li key={id} className="flex items-center space-x-2">
              <ClipLoader size={16} /> {/* Per-file spinner */}
              <span>Uploading {resumeFiles[id].name}</span>
            </li>
          ))}
          {resumes.map(r => (
            <li key={`resume-${r.idx}`} className="flex justify-between">
              <span>{r.name}</span>
              <button
                onClick={() => handleDeleteResume(r.idx, r.name)}
                className="text-red-500"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* Ranking Section */}
      <section className="border p-4 rounded-lg">
        <button
          onClick={handleRank}
          disabled={ranking}
          className="px-4 py-2 bg-purple-600 text-white rounded mb-4"
        >
          {ranking
            ? <ClipLoader size={20} />   // Global ranking spinner
            : "Rank!"}
        </button>
        <ul>
          {results.map(r => (
            <li key={r.name}>
              {r.name}: {r.score.toFixed(2)}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}