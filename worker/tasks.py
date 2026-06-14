"""
Tareas Celery para segmentación asíncrona.

Las imágenes viajan como base64 (JSON-serializable).
El resultado es el mismo dict que devuelve segment_garments().

Iniciar el worker:
  celery -A celery_app worker --loglevel=info --concurrency=1

Con concurrency=1 porque YOLOv8 ya paraleliza internamente con PyTorch.
"""
import base64
import logging

from celery_app import celery_app
from segmenter import segment_garments

log = logging.getLogger(__name__)


@celery_app.task(
    bind=True,
    name="tasks.segment_image",
    max_retries=2,
    default_retry_delay=5,
    soft_time_limit=120,   # 2 min timeout blando
    time_limit=150,         # 2.5 min timeout duro
)
def segment_image_task(
    self,
    image_b64: str,
    conf_threshold: float = 0.35,
    model_path: str = "yolov8n-seg.pt",
) -> dict:
    """
    Task asíncrono: decodifica imagen, segmenta y devuelve JSON con crops.

    Args:
        image_b64: Imagen en base64 (sin prefijo data:image/...).
        conf_threshold: Confianza mínima para detecciones.
        model_path: Ruta al modelo YOLO.
    """
    try:
        image_bytes = base64.b64decode(image_b64)
        log.info("Task %s: procesando imagen (%d bytes).", self.request.id, len(image_bytes))
        result = segment_garments(image_bytes, conf_threshold, model_path)
        log.info("Task %s: %d segmentos encontrados.", self.request.id, result["total"])
        return result
    except Exception as exc:
        log.exception("Task %s falló: %s", self.request.id, exc)
        raise self.retry(exc=exc)
