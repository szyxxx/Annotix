FROM python:3.12-slim
WORKDIR /app
# libgl/libglib for opencv; git so pip can install ultralytics' CLIP fork
RUN apt-get update && apt-get install -y --no-install-recommends libgl1 libglib2.0-0 git \
    && rm -rf /var/lib/apt/lists/*
RUN pip install --no-cache-dir fastapi "uvicorn[standard]" ultralytics \
    --extra-index-url https://download.pytorch.org/whl/cpu
# Text-encoder dependency for the open-vocabulary model (YOLOE). Installed at
# build time — at runtime ultralytics would try to auto-install it and fail.
RUN pip install --no-cache-dir git+https://github.com/ultralytics/CLIP.git
# Bake all model weights (baseline YOLO11 + YOLOE + its text encoder) into the
# image so the first prediction is instant and needs no network.
RUN python - <<'PY'
from ultralytics import YOLO, YOLOE
YOLO("yolo11n.pt")
YOLO("yolo11n-seg.pt")
m = YOLOE("yoloe-11s-seg.pt")
m.set_classes(["object"], m.get_text_pe(["object"]))
PY
COPY main.py ./
EXPOSE 8100
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8100"]
