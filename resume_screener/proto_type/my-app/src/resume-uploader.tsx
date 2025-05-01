"use client"

import type React from "react"
import { useEffect, useState, useCallback, useRef } from "react"
import axios from "axios"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  FileIcon,
  UploadIcon,
  TrashIcon,
  FileTextIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  BarChart3Icon,
} from "lucide-react"

const API_URL = "http://localhost:8000"

// We'll dynamically load PDF.js only on the client side
let pdfjsLib: any = null
let GlobalWorkerOptions: any = null

// Define a type for resume file with status
type ResumeFile = {
  file: File
  id: string
  status: "pending" | "uploading" | "success" | "error"
  progress: number
  message?: string
}

interface ResumeUploaderProps {
  jobUploaded: boolean
  onRankStart?: () => void
  onRankComplete?: (results: any[]) => void
}

export default function ResumeUploader({ jobUploaded, onRankStart, onRankComplete }: ResumeUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileDialog = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

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

  const [resumeFiles, setResumeFiles] = useState<ResumeFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isRanking, setIsRanking] = useState(false)
  const [globalStatus, setGlobalStatus] = useState<{ type: "success" | "error" | null; message: string }>({
    type: null,
    message: "",
  })

  // Generate a unique ID for each file
  const generateId = () => {
    return Math.random().toString(36).substring(2, 9)
  }

  // Text extraction utility
  const extractText = async (file: File) => {
    if (!pdfjsLib) {
      return { text: "", error: "PDF.js library not loaded. Please try again." }
    }

    try {
      const arrayBuffer = await new Response(file).arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

      let text = ""
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const content = await page.getTextContent()
        text += content.items.map((item: any) => item.str).join(" ") + "\n\n"
      }
      return { text, error: null }
    } catch (error) {
      return { text: "", error: "Failed to extract text from PDF." }
    }
  }

  // Upload a single resume PDF
  const uploadSingleResume = async (resumeFile: ResumeFile) => {
    if (resumeFile.status === "success") return

    // Update file status to uploading
    setResumeFiles((prev) =>
      prev.map((file) => (file.id === resumeFile.id ? { ...file, status: "uploading", progress: 10 } : file)),
    )

    try {
      // Extract text
      const { text, error } = await extractText(resumeFile.file)

      if (error) {
        setResumeFiles((prev) =>
          prev.map((file) => (file.id === resumeFile.id ? { ...file, status: "error", message: error } : file)),
        )
        return
      }

      // Update progress
      setResumeFiles((prev) => prev.map((file) => (file.id === resumeFile.id ? { ...file, progress: 50 } : file)))

      // Send to API
      await axios.post(`${API_URL}/resume`, {
        name: resumeFile.file.name,
        text,
      })

      // Update status to success
      setResumeFiles((prev) =>
        prev.map((file) => (file.id === resumeFile.id ? { ...file, status: "success", progress: 100 } : file)),
      )
    } catch (error) {
      setResumeFiles((prev) =>
        prev.map((file) =>
          file.id === resumeFile.id ? { ...file, status: "error", message: "Failed to upload resume." } : file,
        ),
      )
    }
  }

  // Upload all pending resumes
  const handleUploadResumes = async () => {
    if (typeof window === "undefined") {
      setGlobalStatus({
        type: "error",
        message: "This feature is only available in the browser.",
      })
      return
    }

    const pendingFiles = resumeFiles.filter((file) => file.status === "pending")
    if (pendingFiles.length === 0) return

    setIsUploading(true)
    setGlobalStatus({ type: null, message: "" })

    try {
      // Process files sequentially to avoid overwhelming the server
      for (const file of pendingFiles) {
        await uploadSingleResume(file)
      }

      setGlobalStatus({
        type: "success",
        message: "All resumes processed successfully!",
      })
    } catch (error) {
      setGlobalStatus({
        type: "error",
        message: "Failed to process some resumes. Please try again.",
      })
    } finally {
      setIsUploading(false)
    }
  }

  // Rank resumes against job description
  const handleRankResumes = async () => {
    if (!jobUploaded) {
      setGlobalStatus({
        type: "error",
        message: "Please upload a job description first.",
      })
      return
    }

    const uploadedResumes = resumeFiles.filter((file) => file.status === "success")
    if (uploadedResumes.length === 0) {
      setGlobalStatus({
        type: "error",
        message: "Please upload at least one resume first.",
      })
      return
    }

    setIsRanking(true)
    if (onRankStart) {
      onRankStart()
    }

    try {
      // Call the correct matching API endpoint (GET /match)
      const response = await axios.get(`${API_URL}/match`)

      // Process the results based on the actual API response format
      const matchData = response.data.matches || []

      // Map the API response to our component's expected format
      const results = matchData.map((match: { name: string; score: number }) => {
        // Find the original file object to include file details
        const resumeFile = resumeFiles.find((file) => file.file.name === match.name)

        return {
          name: match.name,
          score: Math.round(match.score * 100), // Convert decimal score to percentage
          file: resumeFile?.file,
        }
      })

      // Sort by score (highest first)
      results.sort((a: any, b: any) => b.score - a.score)

      // Call the callback with the results
      if (onRankComplete) {
        onRankComplete(results)
      }

      setGlobalStatus({
        type: "success",
        message: "Resumes ranked successfully!",
      })
    } catch (error) {
      setGlobalStatus({
        type: "error",
        message: "Failed to rank resumes. Please try again.",
      })

      // Call the callback with empty results
      if (onRankComplete) {
        onRankComplete([])
      }
    } finally {
      setIsRanking(false)
    }
  }

  // // Delete a single resume
  // const handleDeleteResume = async (id: string) => {
  //   const fileToDelete = resumeFiles.find((file) => file.id === id)
  //   if (!fileToDelete) return

  //   if (fileToDelete.status === "success") {
  //     try {
  //       // If the file was successfully uploaded, delete it from the server
  //       await axios.delete(`${API_URL}/resume/${encodeURIComponent(fileToDelete.file.name)}`)
  //     } catch (error) {
  //       console.error("Failed to delete resume from server:", error)
  //     }
  //   }

  //   // Remove from local state
  //   setResumeFiles((prev) => prev.filter((file) => file.id !== id))
  // }

  // Delete all resumes
  const handleDeleteAllResumes = async () => {
    try {
      // Delete all uploaded resumes from the server
      await axios.delete(`${API_URL}/resumes`)

      // Clear local state
      setResumeFiles([])
      setGlobalStatus({ type: "success", message: "All resumes deleted successfully!" })
    } catch (error) {
      setGlobalStatus({
        type: "error",
        message: "Failed to delete all resumes. Please try again.",
      })
    }
  }

  // Handle drag events
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      const newFiles: ResumeFile[] = []

      for (let i = 0; i < files.length; i++) {
        const file = files[i]

        // Check if a file with the same name already exists
        if (resumeFiles.some((existingFile) => existingFile.file.name === file.name)) {
          setGlobalStatus({ type: "error", message: `File "${file.name}" has already been uploaded.` })
          continue
        }

        if (file.type === "application/pdf") {
          newFiles.push({
            file,
            id: generateId(),
            status: "pending",
            progress: 0,
          })
        }
      }

      if (newFiles.length > 0) {
        setResumeFiles((prev) => [...prev, ...newFiles])
        setGlobalStatus({ type: null, message: "" })
      } else if (newFiles.length === 0 && files.length > 0) {
        setGlobalStatus({ type: "error", message: "Please upload PDF files only." })
      }
    }
  }, [resumeFiles])

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      const newFiles: ResumeFile[] = []

      for (let i = 0; i < files.length; i++) {
        const file = files[i]

        // Check if a file with the same name already exists
        if (resumeFiles.some((existingFile) => existingFile.file.name === file.name)) {
          setGlobalStatus({ type: "error", message: `File "${file.name}" has already been uploaded.` })
          continue
        }

        if (file.type === "application/pdf") {
          newFiles.push({
            file,
            id: generateId(),
            status: "pending",
            progress: 0,
          })
        }
      }

      if (newFiles.length > 0) {
        setResumeFiles((prev) => [...prev, ...newFiles])
        setGlobalStatus({ type: null, message: "" })
      } else if (newFiles.length === 0 && files.length > 0) {
        setGlobalStatus({ type: "error", message: "Please upload PDF files only." })
      }
    }

    // Reset the input value so the same file can be selected again
    if (e.target) {
      e.target.value = ""
    }
  }

  // Count files by status
  const pendingCount = resumeFiles.filter((file) => file.status === "pending").length
  const successCount = resumeFiles.filter((file) => file.status === "success").length
  const errorCount = resumeFiles.filter((file) => file.status === "error").length

  return (
    <div className="container max-w-2xl mx-auto p-4">
      <Card className="w-full">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl flex items-center gap-2">
            <FileTextIcon className="h-5 w-5" />
            Resume
          </CardTitle>
          <CardDescription>Upload your resumes in PDF format</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* File Drop Zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
            }`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="rounded-full bg-muted p-4">
                <UploadIcon className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <p className="text-lg font-medium">Drag and drop your resumes here</p>
                <p className="text-sm text-muted-foreground mt-1">or click to browse files</p>
              </div>
              <Button
                variant="outline"
                type="button"
                className=" flex items-center gap-2"
                onClick={handleFileDialog}
              >
                <UploadIcon className="h-4 w-4" />
                Select Resume PDFs
              </Button>
              <input
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                className="hidden"
                ref={fileInputRef}
                multiple
              />
            </div>
          </div>

          {/* Status Messages */}
          {globalStatus.type && (
            <Alert variant={globalStatus.type === "error" ? "destructive" : "default"}>
              {globalStatus.type === "error" ? (
                <AlertCircleIcon className="h-4 w-4" />
              ) : (
                <CheckCircleIcon className="h-4 w-4" />
              )}
              <AlertDescription>{globalStatus.message}</AlertDescription>
            </Alert>
          )}

          {/* Uploaded Files Section */}
          {resumeFiles.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Uploaded Resumes</h3>
                <div className="flex gap-2">
                  {pendingCount > 0 && (
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                      {pendingCount} pending
                    </Badge>
                  )}
                  {successCount > 0 && (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      {successCount} uploaded
                    </Badge>
                  )}
                  {errorCount > 0 && (
                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                      {errorCount} failed
                    </Badge>
                  )}
                </div>
              </div>

              <Separator />

              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {resumeFiles.map((resumeFile) => (
                  <div key={resumeFile.id} className="flex items-center justify-between p-3 rounded-md border bg-card">
                    <div className="flex items-center gap-3">
                      <div
                        className={`
                        rounded-full p-2
                        ${
                          resumeFile.status === "success"
                            ? "bg-green-100"
                            : resumeFile.status === "error"
                              ? "bg-red-100"
                              : resumeFile.status === "uploading"
                                ? "bg-blue-100"
                                : "bg-gray-100"
                        }
                      `}
                      >
                        <FileIcon
                          className={`h-4 w-4 
                          ${
                            resumeFile.status === "success"
                              ? "text-green-600"
                              : resumeFile.status === "error"
                                ? "text-red-600"
                                : resumeFile.status === "uploading"
                                  ? "text-blue-600"
                                  : "text-gray-600"
                          }
                        `}
                        />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium truncate max-w-[180px]">{resumeFile.file.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {(resumeFile.file.size / 1024 / 1024).toFixed(2)} MB
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Status indicator */}
                      {resumeFile.status === "pending" && (
                        <Badge
                          variant="outline"
                          className="bg-gray-50 border-gray-200 text-gray-700 flex items-center gap-1"
                        >
                          <ClockIcon className="h-3 w-3" />
                          <span>Pending</span>
                        </Badge>
                      )}

                      {resumeFile.status === "uploading" && (
                        <div className="w-20">
                          <Progress value={resumeFile.progress} className="h-1.5" />
                        </div>
                      )}

                      {resumeFile.status === "success" && (
                        <Badge
                          variant="outline"
                          className="bg-green-50 border-green-200 text-green-700 flex items-center gap-1"
                        >
                          <CheckCircleIcon className="h-3 w-3" />
                          <span>Uploaded</span>
                        </Badge>
                      )}

                      {resumeFile.status === "error" && (
                        <Badge
                          variant="outline"
                          className="bg-red-50 border-red-200 text-red-700 flex items-center gap-1"
                        >
                          <AlertCircleIcon className="h-3 w-3" />
                          <span>Failed</span>
                        </Badge>
                      )}

                      {/* Delete button */}
                      {/* <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-red-600"
                        onClick={() => handleDeleteResume(resumeFile.id)}
                        disabled={resumeFile.status === "uploading"}
                      >
                        <XIcon className="h-4 w-4" />
                      </Button> */}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleDeleteAllResumes}
              disabled={resumeFiles.length === 0 || isUploading || isRanking}
              className="text-red-500 hover:text-red-600 hover:bg-red-50"
            >
              <TrashIcon className="h-4 w-4 mr-2" />
              Delete All
            </Button>

            {successCount > 0 && jobUploaded && (
              <Button
                variant="secondary"
                onClick={handleRankResumes}
                disabled={isUploading || isRanking || successCount === 0}
                className="bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
              >
                <BarChart3Icon className="h-4 w-4 mr-2" />
                Rank Resumes
              </Button>
            )}
          </div>

          <Button
            onClick={handleUploadResumes}
            disabled={pendingCount === 0 || isUploading || isRanking}
            className="relative"
          >
            {isUploading ? "Processing..." : "Upload Resumes"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
