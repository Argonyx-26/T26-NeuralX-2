from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import triage, clarify, routing, referrals

app = FastAPI(
    title="SetuHealth Backend API",
    description=(
        "Clinical risk-triage and referral-routing system. "
        "Risk scoring is fully deterministic and auditable. "
        "LLM is used only for symptom extraction and clarifying question generation."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS — allow all origins for hackathon dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount route modules
app.include_router(triage.router, prefix="/api", tags=["Phase 1 — Triage & Scoring"])
app.include_router(clarify.router, prefix="/api", tags=["Phase 2 — Uncertainty Handler"])
app.include_router(routing.router, prefix="/api", tags=["Phase 3 — Smart Routing"])
app.include_router(referrals.router, prefix="/api", tags=["Phase 4 — Outcome Tracking"])


@app.get("/", tags=["Health"])
async def root():
    return {
        "service": "SetuHealth Backend",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "extract": "POST /api/extract",
            "score": "POST /api/score",
            "clarify": "POST /api/clarify",
            "clarify_answer": "POST /api/clarify/answer",
            "route": "POST /api/route",
            "referrals_list": "GET /api/referrals",
            "referral_confirm": "POST /api/referrals/{id}/confirm",
            "mismatch_log": "GET /api/mismatch-log",
        },
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "ok"}
