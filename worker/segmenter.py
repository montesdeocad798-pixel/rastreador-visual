"""
Módulo de segmentación de prendas usando YOLOv8.

YOLOv8n-seg.pt usa COCO (80 clases). Para segmentación de prendas específicas
(camisa, pantalón, vestido, etc.) se recomienda un modelo fine-tuned en
DeepFashion2 o FashionPedia. Aquí usamos las clases COCO más relevantes
para moda y devolvemos crops con fondo transparente.
"""
from __future__ import annotations

import base64
import io
import logging
from functools import lru_cache
from typing import Any

import cv2
import numpy as np
from PIL import Image
from ultralytics import YOLO

log = logging.getLogger(__name__)

# ── Clases COCO relevantes para moda ────────────────────────────────────────
# Para segmentación granular (camisa, pantalón, etc.) reemplaza 'yolov8n-seg.pt'
# por un modelo entrenado en FashionPedia/DeepFashion2.
FASHION_CLASSES: dict[int, str] = {
    0:  "persona",   # captura el outfit completo
    24: "mochila",
    26: "bolso",
    28: "corbata",
}


@lru_cache(maxsize=1)
def load_model(model_path: str = "yolov8n-seg.pt") -> YOLO:
    """Carga el modelo una sola vez (singleton)."""
    log.info("Cargando modelo YOLOv8 desde %s ...", model_path)
    model = YOLO(model_path)
    log.info("Modelo listo.")
    return model


def _make_transparent_crop(
    img_bgr: np.ndarray,
    polygon: np.ndarray,
    x1: int, y1: int, x2: int, y2: int,
) -> str | None:
    """
    Aplica la máscara de segmentación (polígono) como canal alpha y recorta
    el bounding box. Devuelve la imagen como data-URI PNG base64 o None si
    el crop está vacío.
    """
    h, w = img_bgr.shape[:2]

    # Construir máscara binaria desde el polígono (coordenadas en espacio original)
    mask = np.zeros((h, w), dtype=np.uint8)
    pts = polygon.astype(np.int32).reshape(-1, 1, 2)
    cv2.fillPoly(mask, [pts], 255)

    # Convertir a RGBA y asignar alpha
    img_rgba = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGBA)
    img_rgba[:, :, 3] = mask

    # Recortar al bounding box (clamping a los límites de la imagen)
    y1c, y2c = max(0, y1), min(h, y2)
    x1c, x2c = max(0, x1), min(w, x2)
    crop = img_rgba[y1c:y2c, x1c:x2c]

    if crop.size == 0:
        return None

    pil = Image.fromarray(cv2.cvtColor(crop, cv2.COLOR_BGRA2RGBA))
    buf = io.BytesIO()
    pil.save(buf, format="PNG", optimize=True)
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


def segment_garments(
    image_bytes: bytes,
    conf_threshold: float = 0.35,
    model_path: str = "yolov8n-seg.pt",
) -> dict[str, Any]:
    """
    Segmenta prendas en la imagen y devuelve crops con fondo transparente.

    Args:
        image_bytes: Imagen cruda en bytes (JPEG/PNG/WEBP).
        conf_threshold: Confianza mínima para aceptar una detección.
        model_path: Ruta al modelo YOLO (.pt).

    Returns:
        {
          "total": int,
          "segmentos": [
            {
              "id": int,
              "clase": str,
              "confianza": float,
              "bbox": {"x1": int, "y1": int, "x2": int, "y2": int},
              "imagen_b64": "data:image/png;base64,..."
            }, ...
          ]
        }
    """
    model = load_model(model_path)

    # Decodificar imagen
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("No se pudo decodificar la imagen. Formato no soportado.")

    # Inferencia
    results = model(
        img,
        classes=list(FASHION_CLASSES.keys()),
        conf=conf_threshold,
        verbose=False,
    )

    segments: list[dict[str, Any]] = []

    for result in results:
        if result.masks is None or result.boxes is None:
            continue

        # masks.xy devuelve polígonos en coordenadas del espacio original,
        # evitando problemas de letterboxing al redimensionar máscaras.
        for idx, (box, polygon) in enumerate(zip(result.boxes, result.masks.xy)):
            class_id   = int(box.cls[0])
            confidence = float(box.conf[0])
            x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())

            b64 = _make_transparent_crop(img, polygon, x1, y1, x2, y2)
            if b64 is None:
                continue

            segments.append({
                "id":         idx,
                "clase":      FASHION_CLASSES.get(class_id, f"clase_{class_id}"),
                "confianza":  round(confidence, 3),
                "bbox":       {"x1": x1, "y1": y1, "x2": x2, "y2": y2},
                "imagen_b64": b64,
            })

    return {"total": len(segments), "segmentos": segments}
