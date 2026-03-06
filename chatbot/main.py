"""FastAPI entry point for the chatbot microservice."""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from graph import run_query
from seed_data import seed

app = FastAPI(title="E-Commerce Analytics Chatbot", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200", "http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    question: str
    user_role: str = "ADMIN"
    user_id: int = 1
    store_id: Optional[int] = None


class ChatResponse(BaseModel):
    answer: str
    sql_query: Optional[str] = None
    data: Optional[dict] = None
    visualization_html: Optional[str] = None


@app.on_event("startup")
def startup():
    seed()


@app.post("/api/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    if not req.question or not req.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    result = run_query(
        question=req.question,
        user_role=req.user_role,
        user_id=req.user_id,
        store_id=req.store_id,
    )

    return ChatResponse(
        answer=result["answer"],
        sql_query=result.get("sql_query"),
        data=result.get("data"),
        visualization_html=result.get("visualization_html"),
    )


@app.get("/health")
def health():
    return {"status": "ok", "service": "chatbot"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
