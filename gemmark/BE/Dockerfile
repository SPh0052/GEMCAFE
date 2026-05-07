FROM python:3.11-slim-bookworm

WORKDIR /app

# 시스템 패키지 설치 (opencv 의존성 + 강건성 테스트 H.264 재인코딩용 ffmpeg)
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]