from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum


class JobStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    DONE = "done"
    ERROR = "error"


class Word(BaseModel):
    word: str
    start: float
    end: float
    confidence: float


class TextStyle(BaseModel):
    font: str = "Inter"
    fontSize: int = 48
    color: str = "#FFFFFF"
    bold: bool = False
    italic: bool = False
    shadow: bool = True
    outline: bool = True
    outlineColor: str = "#000000"
    animation: str = "none"
    position: dict = Field(default_factory=lambda: {"x": 50, "y": 85})
    align: str = "center"


class Segment(BaseModel):
    id: int
    start: float
    end: float
    text: str
    transliterated: str = ""
    translated_en: str = ""
    words: List[Word] = []
    style: TextStyle = Field(default_factory=TextStyle)


class TranscriptionResult(BaseModel):
    job_id: str
    filename: str
    duration: float
    language: str
    segments: List[Segment]


class JobResponse(BaseModel):
    job_id: str
    status: JobStatus
    progress: float = 0.0
    message: str = ""
    result: Optional[TranscriptionResult] = None
    error: Optional[str] = None


class TranscribeRequest(BaseModel):
    language: Optional[str] = None


class TranslateRequest(BaseModel):
    mode: str = "romanize"  # romanize | english | tanglish


class SaveSegmentsRequest(BaseModel):
    segments: List[Segment]


class ExportVideoRequest(BaseModel):
    segments: List[Segment]
    format: str = "mp4"
