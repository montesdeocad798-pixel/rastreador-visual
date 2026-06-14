# ── Etapa base ────────────────────────────────────────────────────────────────
FROM python:3.11-slim AS base

# Dependencias del sistema para OpenCV headless y libgomp (PyTorch/YOLO)
RUN apt-get update && apt-get install -y --no-install-recommends \
        libglib2.0-0 \
        libgl1 \
        libgomp1 \
        libgthread-2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ── Instalar dependencias Python (capa cacheada) ───────────────────────────────
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
 && pip install --no-cache-dir -r requirements.txt

# ── Pre-descargar los pesos de YOLOv8 durante el build ────────────────────────
# Evita cold start al primer request en Railway.
# El modelo se guarda en ~/.config/Ultralytics/ y se reutiliza entre reinicios
# si montas un volumen persistente en Railway.
RUN python -c "from ultralytics import YOLO; YOLO('yolov8n-seg.pt')" \
    && echo "Modelo YOLOv8n-seg descargado correctamente."

# ── Copiar código fuente ───────────────────────────────────────────────────────
COPY . .

# Puerto expuesto (Railway sobreescribe $PORT en runtime)
EXPOSE 8000

# ── Arranque ───────────────────────────────────────────────────────────────────
# --workers 1: un solo proceso porque YOLOv8 ya usa multi-threading interno.
#              Aumentar workers requeriría un model server compartido (Triton).
# --timeout-keep-alive 65: mayor que el timeout de Railway (60 s) para evitar
#              que la conexión se cierre antes del response en imágenes grandes.
CMD ["sh", "-c", \
     "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1 --timeout-keep-alive 65"]
