"""
Configuración de Celery con Redis como broker y backend.

Variables de entorno:
  REDIS_URL  — URL completa de Redis (ej: redis://localhost:6379/0)
               Railway la inyecta automáticamente al añadir el plugin Redis.
"""
import os
from celery import Celery

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "dxmg_segmentation",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=["tasks"],
)

celery_app.conf.update(
    # Serialización
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    # Tiempo de vida de resultados (1 hora)
    result_expires=3600,
    # Tracking
    task_track_started=True,
    worker_prefetch_multiplier=1,   # un task a la vez por worker (pesado en RAM)
    task_acks_late=True,            # ack tras completar, no al recibir
    # Zona horaria
    timezone="UTC",
    enable_utc=True,
)
