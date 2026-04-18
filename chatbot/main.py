"""FastAPI entry point for the chatbot microservice."""
import json
import os
import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Iterator, Optional, List
from collections import defaultdict
from graph import run_query, run_query_stream
from seed_data import seed
import config


@asynccontextmanager
async def lifespan(_app: FastAPI):
    if not config.USE_SHARED_DB:
        seed()
    else:
        print("=== Using shared database, skipping seed ===")
    yield


app = FastAPI(title="E-Commerce Analytics Chatbot", version="1.0.0", lifespan=lifespan)

CORS_ORIGINS = os.getenv(
    "CORS_ORIGINS", "http://localhost:4200,http://localhost:8080"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory conversation store keyed by session_id
_sessions: dict[str, list[dict]] = defaultdict(list)
_session_last_active: dict[str, float] = {}
MAX_HISTORY = 10
SESSION_TIMEOUT_SECS = 3600  # 1 hour
MAX_QUESTION_LENGTH = 1000


class ChatRequest(BaseModel):
    question: str = Field(..., max_length=MAX_QUESTION_LENGTH)
    user_role: str = "ADMIN"
    user_id: int = 1
    store_id: Optional[int] = None
    session_id: Optional[str] = None


class ChatResponse(BaseModel):
    answer: str
    question: Optional[str] = None
    sql_query: Optional[str] = None
    query_result: Optional[dict] = None
    data: Optional[dict] = None
    error: Optional[str] = None
    final_answer: Optional[str] = None
    visualization_html: Optional[str] = None
    visualization_code: Optional[str] = None
    is_in_scope: Optional[bool] = None
    is_greeting: Optional[bool] = None
    iteration_count: Optional[int] = None

def _cleanup_expired_sessions():
    """Remove sessions that have been inactive for longer than SESSION_TIMEOUT_SECS."""
    now = time.time()
    expired = [sid for sid, ts in _session_last_active.items()
               if now - ts > SESSION_TIMEOUT_SECS]
    for sid in expired:
        _sessions.pop(sid, None)
        _session_last_active.pop(sid, None)


def _build_context(session_id: str) -> str:
    """Build conversation context from previous turns."""
    if not session_id or session_id not in _sessions:
        return ""
    # Check session expiry
    if time.time() - _session_last_active.get(session_id, 0) > SESSION_TIMEOUT_SECS:
        _sessions.pop(session_id, None)
        _session_last_active.pop(session_id, None)
        return ""
    history = _sessions[session_id][-MAX_HISTORY:]
    if not history:
        return ""
    lines = []
    for i, turn in enumerate(history, 1):
        lines.append(f"Turn {i}:")
        lines.append(f"  Question: {turn['question']}")
        if turn.get('sql_query'):
            # Normalize to single line so downstream regex can capture full SQL
            sql_oneline = ' '.join(turn['sql_query'].split())
            lines.append(f"  SQL: {sql_oneline}")
        if turn.get('columns'):
            lines.append(f"  Result columns: {', '.join(turn['columns'])}")
        if turn.get('answer'):
            # Truncate long answers to keep context manageable
            answer = turn['answer'][:500] + "..." if len(turn['answer']) > 500 else turn['answer']
            lines.append(f"  Answer: {answer}")
    return "\n".join(lines)


@app.post("/api/chat", response_model=ChatResponse)
def chat(req: ChatRequest, x_api_key: Optional[str] = Header(None, alias="X-API-Key")):
    # Verify internal API key — only the backend should call this endpoint
    if x_api_key != config.INTERNAL_API_KEY:
        raise HTTPException(status_code=403, detail="Invalid or missing API key")

    if not req.question or not req.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    # Periodically clean up expired sessions
    _cleanup_expired_sessions()

    # Build context for multi-turn (passed separately so guardrails sees only the new question)
    context = _build_context(req.session_id) if req.session_id else ""

    result = run_query(
        question=req.question,
        user_role=req.user_role,
        user_id=req.user_id,
        store_id=req.store_id,
        conversation_context=context,
    )

    # Store turn in session (include result columns for follow-up context) and update timestamp
    if req.session_id:
        _session_last_active[req.session_id] = time.time()
        result_columns = []
        if result.get("data") and result["data"].get("columns"):
            result_columns = result["data"]["columns"]
        _sessions[req.session_id].append({
            "question": req.question,
            "answer": result.get("answer", ""),
            "sql_query": result.get("sql_query"),
            "columns": result_columns,
        })

    return ChatResponse(
        answer=result["answer"],
        question=result.get("question"),
        sql_query=result.get("sql_query"),
        query_result=result.get("query_result"),
        data=result.get("data"),
        error=result.get("error"),
        final_answer=result.get("final_answer"),
        visualization_html=result.get("visualization_html"),
        visualization_code=result.get("visualization_code"),
        is_in_scope=result.get("is_in_scope"),
        is_greeting=result.get("is_greeting"),
        iteration_count=result.get("iteration_count"),
    )


@app.post("/api/chat/stream")
def chat_stream(req: ChatRequest, x_api_key: Optional[str] = Header(None, alias="X-API-Key")):
    """SSE endpoint: streams per-agent step events and a final result.

    Each event is framed as:
        event: step | final
        data: <json>
    """
    if x_api_key != config.INTERNAL_API_KEY:
        raise HTTPException(status_code=403, detail="Invalid or missing API key")

    if not req.question or not req.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    _cleanup_expired_sessions()
    context = _build_context(req.session_id) if req.session_id else ""
    session_id = req.session_id

    def event_stream() -> Iterator[bytes]:
        final_payload: Optional[dict] = None
        try:
            for event in run_query_stream(
                question=req.question,
                user_role=req.user_role,
                user_id=req.user_id,
                store_id=req.store_id,
                conversation_context=context,
            ):
                event_name = "final" if event.get("step") == "final" else "step"
                if event_name == "final":
                    final_payload = event.get("payload", {})
                data_json = json.dumps(event, default=str)
                yield f"event: {event_name}\ndata: {data_json}\n\n".encode("utf-8")
        except Exception as ex:  # noqa: BLE001
            err = {"step": "final", "status": "error",
                   "payload": {"answer": f"Internal error: {ex}", "error": str(ex)}}
            yield f"event: final\ndata: {json.dumps(err)}\n\n".encode("utf-8")
            return

        # Persist turn into session history so follow-up questions keep context.
        if session_id and final_payload is not None:
            _session_last_active[session_id] = time.time()
            result_columns = []
            data = final_payload.get("data") or {}
            if isinstance(data, dict) and data.get("columns"):
                result_columns = data["columns"]
            _sessions[session_id].append({
                "question": req.question,
                "answer": final_payload.get("answer", ""),
                "sql_query": final_payload.get("sql_query"),
                "columns": result_columns,
            })

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@app.get("/health")
def health():
    return {"status": "ok", "service": "chatbot"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
