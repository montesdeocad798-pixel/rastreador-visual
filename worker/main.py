"""
DXMG Segmentation Worker — FastAPI

Endpoints:
  POST /segment          → Síncrono (thread pool). Ideal para imágenes pequeñas.
  POST /segment/async    → Asíncrono via Celery + Redis. Ideal para producción.
  GET  /segment/result/{task_id} → Consulta estado/resultado de la tarea.
  GET  /health           → Health check.
"""
from __future__ import annotations

import asyncio
import base64
import logging
import os
from concurrent.futures import ThreadPoolExecutor
from contextlib import asynccontextmanager

from celery.result import AsyncResult
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from celery_app import celery_app
from segmenter import load_model, segment_garments
from tasks import segment_image_task

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

MAX_FILE_SIZE = 15 * 1024 * 1024   # 15 MB
CONF_THRESHOLD = float(os.getenv("CONF_THRESHOLD", "0.35"))

# Un pool de 2 hilos para no bloquear el event loop durante la inferencia
_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="yolo")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Pre-cargar el modelo al arrancar (evita cold start en la primera petición)
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(_executor, load_model)
    log.info("Modelo YOLOv8 pre-cargado y listo.")
    yield
    _executor.shutdown(wait=False)


app = FastAPI(
    title="DXMG Segmentation Worker",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],    # Restringir en producción a tu dominio Node.js
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


# ── Helpers ──────────────────────────────────────────────────────────────────

async def _read_and_validate(file: UploadFile) -> bytes:
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=415, detail="Solo se aceptan imágenes (image/*).")
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="Imagen demasiado grande. Máximo 15 MB.")
    return contents


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/health", tags=["Sistema"])
async def health():
    return {"status": "ok", "service": "dxmg-segmentation-worker"}


@app.post("/segment", response_class=JSONResponse, tags=["Segmentación"])
async def segment_sync(file: UploadFile = File(...)):
    """
    Segmentación síncrona (thread pool).
    La inferencia YOLOv8 corre en un hilo separado para no bloquear el event loop.
    Tiempo de respuesta típico: 200–800 ms en CPU según tamaño de imagen.
    """
    contents = await _read_and_validate(file)

    loop = asyncio.get_event_loop()
    try:
        result = await loop.run_in_executor(
            _executor,
            segment_garments,
            contents,
            CONF_THRESHOLD,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    return JSONResponse(result)


@app.post("/segment/async", tags=["Segmentación"])
async def segment_async(file: UploadFile = File(...)):
    """
    Segmentación asíncrona via Celery + Redis.
    La imagen se encola y se devuelve un task_id inmediatamente.
    Ideal cuando la inferencia puede tardar varios segundos (modelos grandes).
    """
    contents = await _read_and_validate(file)

    # Celery requiere datos JSON-serializables → base64
    image_b64 = base64.b64encode(contents).decode()

    task = segment_image_task.delay(image_b64, CONF_THRESHOLD)

    return {
        "task_id":  task.id,
        "status":   "encolado",
        "poll_url": f"/segment/result/{task.id}",
    }


@app.get("/segment/result/{task_id}", tags=["Segmentación"])
async def get_result(task_id: str):
    """
    Consulta el estado o resultado de una tarea Celery.

    Estados posibles: pendiente | iniciando | procesando | completado | error
    """
    result = AsyncResult(task_id, app=celery_app)

    state_map = {
        "PENDING":  "pendiente",
        "RECEIVED": "recibido",
        "STARTED":  "procesando",
        "RETRY":    "reintentando",
    }

    if result.state in state_map:
        return {"task_id": task_id, "status": state_map[result.state]}

    if result.state == "SUCCESS":
        return {
            "task_id":   task_id,
            "status":    "completado",
            "resultado": result.get(),
        }

    if result.state == "FAILURE":
        return {
            "task_id": task_id,
            "status":  "error",
            "detalle": str(result.info),
        }

    return {"task_id": task_id, "status": result.state.lower()}
