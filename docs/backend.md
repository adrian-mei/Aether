# Aether Backend Documentation

## 1. Overview
The Backend is an external service hosted on **Oracle Cloud Infrastructure (OCI)**. It handles all heavy computational tasks, including Speech-to-Text (STT), Large Language Model (LLM) inference, and Text-to-Speech (TTS) synthesis.

## 2. System Design

### Containerized Architecture
The backend runs as a **Docker container** to ensure consistency across environments.

### Core Services
*   **Server Framework**: **Fastify** (Node.js v20+) for high-performance API handling.
*   **STT Engine**: **Whisper-tiny.en** (Local ONNX) for fast speech-to-text transcription.
*   **LLM Integration**: Connects to **Google Gemini 2.0 Flash** via Vercel AI SDK for intelligence.
*   **TTS Engine**: **Kokoro 82M** (Local ONNX) for high-quality, low-latency speech synthesis.

### Hardware
*   **Provider**: Oracle Cloud Always Free Tier.
*   **Instance**: VM.Standard.A1.Flex (ARM Ampere A1).
*   **Specs**: 4 OCPUs, 24 GB RAM.
*   **OS**: Ubuntu 22.04 / Oracle Linux 8 (ARM64).

## 3. Deployment Guide

### Provisioning (Oracle Cloud)
1.  Create an account on Oracle Cloud.
2.  Provision a **VM.Standard.A1.Flex** instance.
3.  Open Port **3002** (or 80/443 with reverse proxy) in the VCN Security List.

### Server Setup
Access the server via SSH:
```bash
ssh -i /path/to/key ubuntu@<public-ip>
```

Install Docker (ARM64):
```bash
sudo apt update
sudo apt install docker.io
sudo usermod -aG docker ubuntu
```

### Deployment Workflow
The backend code is deployed via Docker.

1.  **Sync Code**:
    ```bash
    rsync -avz --exclude 'node_modules' . ubuntu@<ip>:~/aether-backend
    ```

2.  **Build & Run**:
    ```bash
    cd ~/aether-backend
    docker build -t aether-backend .
    docker run -d -p 3002:3002 --env-file .env --name aether-backend --restart always aether-backend
    ```

### Environment Variables (`.env`)
*   `GOOGLE_GENERATIVE_AI_API_KEY`: Gemini API Key.
*   `PORT`: Defaults to 3002.
*   `ADMIN_PASSWORD`: Password for the /admin dashboard.
