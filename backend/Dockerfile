FROM python:3.11-slim

# curl für Healthcheck installieren
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Default command, can be overridden
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]