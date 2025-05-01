"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileIcon, DownloadIcon, EyeIcon, BarChart3Icon, TrophyIcon, HeartIcon } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

// Import PDF.js
let pdfjsLib: any = null
let GlobalWorkerOptions: any = null

// Update the RankingResult interface to include the file
interface RankingResult {
  name: string
  score: number
  file?: File
}

interface RankingResultsProps {
  results: RankingResult[]
  isLoading: boolean
}

export default function RankingResults({ results, isLoading }: RankingResultsProps) {
  const [selectedResume, setSelectedResume] = useState<RankingResult | null>(null)
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    // Only import PDF.js in the browser
    const loadPdfJs = async () => {
      if (typeof window !== "undefined") {
        const pdfjs = await import("pdfjs-dist")
        pdfjsLib = pdfjs
        GlobalWorkerOptions = pdfjs.GlobalWorkerOptions
        GlobalWorkerOptions.workerSrc = "pdf.worker.min.mjs"
      }
    }

    loadPdfJs()
  }, [])

  // Update the getScoreColor function to handle percentage scores correctly
  const getScoreColor = (score: number) => {
    if (score >= 52) return "text-green-600 bg-green-50 border-green-200"
    return "text-red-600 bg-red-50 border-red-200"
  }

  // Get medal based on rank
  const getMedal = (index: number) => {
    if (index === 0) return <TrophyIcon className="h-5 w-5 text-yellow-500" />
    if (index === 1) return <TrophyIcon className="h-5 w-5 text-gray-400" />
    if (index === 2) return <TrophyIcon className="h-5 w-5 text-amber-700" />
    return null
  }

  // Generate a PDF preview URL when a resume is selected
  useEffect(() => {
    if (selectedResume?.file) {
      const fileUrl = URL.createObjectURL(selectedResume.file)
      setPdfPreviewUrl(fileUrl)
    } else {
      setPdfPreviewUrl(null)
    }

    // Cleanup the object URL when the component unmounts or the file changes
    return () => {
      if (pdfPreviewUrl) {
        URL.revokeObjectURL(pdfPreviewUrl)
      }
    }
  }, [selectedResume])

  return (
    <div className="container max-w-2xl mx-auto p-4">
      <Card className="w-full">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl flex items-center gap-2">
            <BarChart3Icon className="h-5 w-5" />
            Resume Rankings
          </CardTitle>
          <CardDescription>Resumes ranked by match score with the job description</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {isLoading ? (
            // Loading state
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : results.length === 0 ? (
            // No results state
            <div className="text-center py-8 text-muted-foreground">
              <p>No ranking results available.</p>
              <p className="text-sm mt-2">Upload a job description and resumes, then click "Rank Resumes".</p>
            </div>
          ) : (
            // Results list
            <div className="space-y-4">
              {results.map((result, index) => (
                <div
                  key={result.name}
                  className={`
                    flex items-center justify-between p-4 rounded-md border 
                    ${selectedResume?.name === result.name ? "border-primary bg-primary/5" : "bg-card"}
                    hover:bg-muted/50 cursor-pointer transition-colors
                    ${result.score >= 0.01 ? getScoreColor(result.score) : "text-muted-foreground"}
                  `}
                  onClick={() => setSelectedResume(result)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8">{getMedal(index)}</div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <FileIcon className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium truncate max-w-[180px]">{result.name}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Progress
                          value={result.score}
                          className="h-1.5 w-24"
                        />
                        <Badge variant="outline" className={`${getScoreColor(result.score)} text-xs`}>
                          {result.score}%
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground flex items-center gap-2"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedResume(result)
                      }}
                    >
                      <EyeIcon className="h-4 w-4" />
                      Details
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground flex items-center gap-2"
                      onClick={(e) => {
                        e.stopPropagation()
                        // Placeholder for like functionality
                      }}
                    >
                      <HeartIcon className="h-4 w-4" />
                      Like
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Resume Details */}
          {selectedResume && (
            <div className="mt-6 border rounded-md p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">{selectedResume.name}</h3>
                <Badge variant="outline" className={`${getScoreColor(selectedResume.score)}`}>
                  Match Score: {selectedResume.score}%
                </Badge>
              </div>

              <Separator className="my-4" />

              <Tabs defaultValue="overview">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="details">Match Details</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Match Score</h4>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Overall Match</span>
                          <Badge variant="outline" className={`${getScoreColor(selectedResume.score)}`}>
                            {selectedResume.score}%
                          </Badge>
                        </div>
                        <Progress
                          value={selectedResume.score}
                          className="h-2"
                          indicatorClassName={
                            selectedResume.score >= 80
                              ? "bg-green-600"
                              : selectedResume.score >= 60
                                ? "bg-blue-600"
                                : selectedResume.score >= 40
                                  ? "bg-amber-600"
                                  : "bg-red-600"
                          }
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Details Tab with PDF Preview */}
                <TabsContent value="details" className="mt-4">
                  <div className="p-2 text-sm text-center text-muted-foreground">
                  </div>
                  {pdfPreviewUrl && (
                    <div className="mt-1">
                      <iframe
                        src={pdfPreviewUrl}
                        className="w-full h-200 border rounded-md"
                        title="PDF Preview"
                      />
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => setSelectedResume(null)} disabled={!selectedResume}>
            Back to List
          </Button>

          {/* {selectedResume && (
            <Button
              variant="secondary"
              className="bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
              onClick={() => {
                // Download functionality would go here
                alert("Download functionality would be implemented here")
              }}
            >
              <DownloadIcon className="h-4 w-4 mr-2" />
              Download Resume
            </Button>
          )} */}
        </CardFooter>
      </Card>
    </div>
  )
}
