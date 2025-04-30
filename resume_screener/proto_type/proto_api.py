from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from proto_matcher import BiasedDocumentMatcher

app = FastAPI()
matcher = BiasedDocumentMatcher()

class JobRequest(BaseModel):
    name: str
    text: str

class ResumeRequest(BaseModel):
    name: str
    text: str

@app.post("/job")
async def set_job(request: JobRequest):
    """
    Set the current job against which resumes will be matched.
    """
    matcher.set_job(request.name, request.text)
    return {"status": "job set", "job_name": request.name}

@app.delete("/job")
async def remove_job():
    """
    Remove the current job.
    """
    matcher.remove_job()
    return {"status": "job removed"}

@app.post("/resume")
async def add_resume(request: ResumeRequest):
    """
    Add a resume to be considered in matching.
    """
    matcher.add_resume(request.name, request.text)
    return {"status": "resume added", "resume_name": request.name}

@app.delete("/resume/{idx}")
async def remove_resume(idx: int):
    """
    Remove a single resume by its list index.
    """
    try:
        matcher.remove_resume(idx)
        return {"status": "resume removed", "index": idx}
    except IndexError:
        raise HTTPException(status_code=404, detail="Resume index out of range")

@app.delete("/resumes")
async def remove_all_resumes():
    """
    Clear all resumes.
    """
    matcher.remove_all_resumes()
    return {"status": "all resumes removed"}

@app.get("/match")
async def match_resumes():
    """
    Compute and return all resume matches above the threshold.
    """
    if matcher.job is None:
        raise HTTPException(status_code=400, detail="Job not set")
    raw_scores = matcher.match_resumes()
    # Return a list of {name, score} dicts
    return {"matches": [{"name": name, "score": score} for score, name in raw_scores]}
