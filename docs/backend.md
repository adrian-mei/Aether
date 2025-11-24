# Aether Backend Documentation

## 1. Overview
The Backend is an external service hosted on **Oracle Cloud Infrastructure (OCI)**. It handles all heavy computational tasks, including Speech-to-Text (STT), Large Language Model (LLM) inference, and Text-to-Speech (TTS) synthesis.

## 2. System Design

### Containerized Architecture
The backend runs as a **Docker container** to ensure consistency across environments.

### Core Services
*   **API Server**: Node.js (Next.js API Routes) handles the WebSocket connection and orchestration.
*   **STT Engine**: Server-side Whisper (or equivalent) processes incoming audio streams.
*   **LLM Integration**: Connects to Google Gemini 2.0 Flash for intelligence.
*   **TTS Engine**: Runs Kokoro 82M (via ONNX/Python bridge) to generate high-quality speech.

### Hardware
*   **Provider**: Oracle Cloud Always Free Tier.
*   **Instance**: VM.Standard.A1.Flex (ARM Ampere A1).
*   **Specs**: 4 OCPUs, 24 GB RAM (Scalable).
*   **OS**: Ubuntu 22.04 (ARM64).

## 3. Deployment Guide

### Provisioning (Oracle Cloud)
1.  Create an account on Oracle Cloud.
2.  Provision a **VM.Standard.A1.Flex** instance.
3.  Open Port **3000** in the VCN Security List (Ingress Rule).

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
The backend code (kept in a separate repository) is deployed via Docker.

1.  **Sync Code**:
    ```bash
    rsync -avz --exclude 'node_modules' . ubuntu@<ip>:~/aether-backend
    ```

2.  **Build & Run**:
    ```bash
    cd ~/aether-backend
    docker build -t aether-backend .
    docker run -d -p 3000:3000 --env-file .env --name aether-backend --restart always aether-backend
    ```

### Environment Variables (`.env`)
*   `GOOGLE_GENERATIVE_AI_API_KEY`: Gemini API Key.
*   `ACCESS_CODE`: Secret code for bypassing rate limits.
*   `CORS_ORIGIN`: The URL of the Netlify Frontend.
