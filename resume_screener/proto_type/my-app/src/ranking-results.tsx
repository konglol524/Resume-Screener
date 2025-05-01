"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileIcon, DownloadIcon, EyeIcon, BarChart3Icon, TrophyIcon } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

// Update the RankingResult interface to match the corrected data structure
interface RankingResult {
  name: string
  score: number
  file?: File
  // Remove the matches property since it's not provided by the API
}

interface RankingResultsProps {
  results: RankingResult[]
  isLoading: boolean
}

export default function RankingResults({ results, isLoading }: RankingResultsProps) {
  const [selectedResume, setSelectedResume] = useState<RankingResult | null>(null)

  // Update the getScoreColor function to handle percentage scores correctly
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 bg-green-50 border-green-200"
    if (score >= 60) return "text-blue-600 bg-blue-50 border-blue-200"
    if (score >= 40) return "text-amber-600 bg-amber-50 border-amber-200"
    return "text-red-600 bg-red-50 border-red-200"
  }

  // Get medal based on rank
  const getMedal = (index: number) => {
    if (index === 0) return <TrophyIcon className="h-5 w-5 text-yellow-500" />
    if (index === 1) return <TrophyIcon className="h-5 w-5 text-gray-400" />
    if (index === 2) return <TrophyIcon className="h-5 w-5 text-amber-700" />
    return null
  }

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
                          indicatorClassName={
                            result.score >= 80
                              ? "bg-green-600"
                              : result.score >= 60
                                ? "bg-blue-600"
                                : result.score >= 40
                                  ? "bg-amber-600"
                                  : "bg-red-600"
                          }
                        />
                        <Badge variant="outline" className={`${getScoreColor(result.score)} text-xs`}>
                          {result.score}%
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedResume(result)
                    }}
                  >
                    <EyeIcon className="h-4 w-4 mr-1" />
                    Details
                  </Button>
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

                {/* Replace the TabsContent for "overview" with this simplified version */}
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

                {/* Replace the TabsContent for "details" with this simplified version */}
                <TabsContent value="details" className="mt-4">
                  <div className="p-4 text-sm text-center text-muted-foreground">
                    <p>Detailed match information is not available.</p>
                    <p className="mt-2">The resume has an overall match score of {selectedResume.score}%.</p>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => setSelectedResume(null)} disabled={!selectedResume}>
            Back to List
          </Button>

          {selectedResume && (
            <Button
              variant="secondary"
              className="bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
              onClick={() => {
                // Download functionality would go here
                // This is a placeholder since we can't actually download the file in this demo
                alert("Download functionality would be implemented here")
              }}
            >
              <DownloadIcon className="h-4 w-4 mr-2" />
              Download Resume
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
