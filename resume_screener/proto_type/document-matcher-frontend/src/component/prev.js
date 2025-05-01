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
    </div>
  );
}