"use client"

import type React from "react"
import { useEffect, useState, useCallback, useRef } from "react"
import axios from "axios"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { FileIcon, UploadIcon, TrashIcon, FileTextIcon, AlertCircleIcon, CheckCircleIcon } from "lucide-react"

const API_URL = "http://localhost:8000"

// We'll dynamically load PDF.js only on the client side
let pdfjsLib: any = null
let GlobalWorkerOptions: any = null

interface JobUploaderProps {
  onUploadSuccess?: () => void
}

export default function JobUploader({ onUploadSuccess }: JobUploaderProps) {
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

  const [jobFile, setJobFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [status, setStatus] = useState<{ type: "success" | "error" | null; message: string }>({
    type: null,
    message: "",
  })

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileDialog = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  // Text extraction utility
  const extractText = async (file: File) => {
    if (!pdfjsLib) {
      setStatus({
        type: "error",
        message: "PDF.js library not loaded. Please try again.",
      })
      return ""
    }

    setUploadProgress(10)
    const arrayBuffer = await new Response(file).arrayBuffer()
    setUploadProgress(30)
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    setUploadProgress(50)

    let text = ""
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const content = await page.getTextContent()
      text += content.items.map((item: any) => item.str).join(" ") + "\n\n"
      setUploadProgress(50 + Math.floor((i / pdf.numPages) * 40))
    }
    return text
  }

  // Upload job description PDF
  const handleUploadJob = async () => {
    if (!jobFile) return
    if (typeof window === "undefined") {
      setStatus({
        type: "error",
        message: "This feature is only available in the browser.",
      })
      return
    }

    try {
      setIsUploading(true)
      setStatus({ type: null, message: "" })

      const text = await extractText(jobFile)

      if (!text) return // If text extraction failed, stop here

      await axios.post(`${API_URL}/job`, { name: jobFile.name, text })

      setUploadProgress(100)
      setStatus({
        type: "success",
        message: "Job description uploaded successfully!",
      })

      // Call the onUploadSuccess callback if provided
      if (onUploadSuccess) {
        onUploadSuccess()
      }
    } catch (error) {
      setStatus({
        type: "error",
        message: "Failed to upload job description. Please try again.",
      })
    } finally {
      setIsUploading(false)
    }
  }

  // Delete job description
  const handleDeleteJob = async () => {
    try {
      await axios.delete(`${API_URL}/job`)
      setJobFile(null)
      setUploadProgress(0)
      setStatus({ type: "success", message: "Job description deleted successfully!" })
    } catch (error) {
      setStatus({
        type: "error",
        message: "Failed to delete job description. Please try again.",
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
    if (files && files.length > 0 && files[0].type === "application/pdf") {
      setJobFile(files[0])
      setStatus({ type: null, message: "" })
    } else {
      setStatus({ type: "error", message: "Please upload a PDF file." })
    }
  }, [])

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      setJobFile(files[0])
      setStatus({ type: null, message: "" })
    }
  }

  return (
    <div className="container max-w-2xl mx-auto p-4">
      <Card className="w-full">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl flex items-center gap-2">
            <FileTextIcon className="h-5 w-5" />
            Job Description
          </CardTitle>
          <CardDescription>Upload a PDF file containing the job description</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* File Drop Zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging
                ? "border-primary bg-primary/5"
                : jobFile
                  ? "border-green-500 bg-green-50"
                  : "border-muted-foreground/25 hover:border-primary/50"
            }`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {!jobFile ? (
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="rounded-full bg-muted p-4">
                  <UploadIcon className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-lg font-medium">Drag and drop your PDF file here</p>
                  <p className="text-sm text-muted-foreground mt-1">or click to browse files</p>
                </div>
                <Button
                  variant="outline"
                  type="button"
                  className=" flex items-center gap-2"
                  onClick={handleFileDialog}
                >
                  <UploadIcon className="h-4 w-4" />
                  Select PDF File
                </Button>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  ref={fileInputRef}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="rounded-full bg-green-100 p-4">
                  <FileIcon className="h-8 w-8 text-green-600" />
                </div>
                <div>
                  <p className="text-lg font-medium text-green-700">{jobFile.name}</p>
                  <p className="text-sm text-muted-foreground mt-1">{(jobFile.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                {/* <Button
                  variant="outline"
                  size="sm"
                  className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600"
                  onClick={() => {
                    setJobFile(null)
                    setUploadProgress(0)
                  }}
                >
                  <TrashIcon className="h-4 w-4 mr-2" />
                  Remove File
                </Button> */}
              </div>
            )}
          </div>

          {/* Progress Bar */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}

          {/* Status Messages */}
          {status.type && (
            <Alert variant={status.type === "error" ? "destructive" : "default"}>
              {status.type === "error" ? (
                <AlertCircleIcon className="h-4 w-4" />
              ) : (
                <CheckCircleIcon className="h-4 w-4" />
              )}
              <AlertDescription>{status.message}</AlertDescription>
            </Alert>
          )}
        </CardContent>

        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={handleDeleteJob} disabled={!jobFile || isUploading}>
            <TrashIcon className="h-4 w-4 mr-2" />
            Delete Job
          </Button>

          <Button onClick={handleUploadJob} disabled={!jobFile || isUploading} className="relative">
            {isUploading ? "Processing..." : "Upload Job"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
