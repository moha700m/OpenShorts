FROM python:3.12-slim
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg fonts-noto-core fonts-noto-extra fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY pyproject.toml ./
COPY openshorts ./openshorts
RUN pip install --no-cache-dir ".[whisper]"
ENV OUTPUT_DIR=/data/output
VOLUME ["/data"]
EXPOSE 8000
CMD ["openshorts", "--serve", "--host", "0.0.0.0", "--port", "8000"]
