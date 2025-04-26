from fastapi import FastAPI
from pydantic import BaseModel, ConfigDict
app = FastAPI()

class resume(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    resumeName: str
    resumeText: str

class input(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    jobdescription: str
    resumelist: list[resume]

@app.get("/")
def home():
    return {"Hello": "World"}

@app.post("/resume")
def send_resume(input: input):
    return {"jobdescription": input.jobdescription, "resumelist": input.resumelist}