"use client"

import { useState } from "react"
import JobUploader from "../job-uploader"
import ResumeUploader from "../resume-uploader"
import RankingResults from "../ranking-results"

export default function Page() {
  const [jobUploaded, setJobUploaded] = useState(false)
  const [rankingResults, setRankingResults] = useState<any[]>([])
  const [isRanking, setIsRanking] = useState(false)

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold text-center mb-8">Resume Matcher</h1>

      <div className="space-y-12 max-w-3xl mx-auto">
        {/* Job Description Uploader (First) */}
        <section>
          <h2 className="text-2xl font-semibold mb-4 text-center">Step 1: Upload Job Description</h2>
          <JobUploader onUploadSuccess={() => setJobUploaded(true)} />
        </section>

        {/* Resume Uploader (Second) */}
        <section>
          <h2 className="text-2xl font-semibold mb-4 text-center">Step 2: Upload Your Resumes</h2>
          <ResumeUploader
            jobUploaded={jobUploaded}
            onRankStart={() => setIsRanking(true)}
            onRankComplete={(results) => {
              setRankingResults(results)
              setIsRanking(false)
            }}
          />
        </section>

        {/* Ranking Results (Third) */}
        {rankingResults.length > 0 && (
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-center">Step 3: Resume Rankings</h2>
            <RankingResults results={rankingResults} isLoading={isRanking} />
          </section>
        )}
      </div>
    </div>
  )
}
