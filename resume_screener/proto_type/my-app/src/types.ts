export interface JobDescription {
    id: string
    filename: string
    text: string
    embedding: number[] // Assuming embeddings are arrays of numbers
  }
  
  export interface Resume {
    id: string
    filename: string
    text: string
    embedding: number[] // Assuming embeddings are arrays of numbers
  }
  
  export interface ProcessResumesResult {
    success: boolean
    resumes: Resume[]
    error?: string
  }
  
  export interface RankedResume extends Resume {
    score: number
  }