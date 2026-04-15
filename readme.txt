MediStream Deployment Guide (SE55)
=================================

Repository
----------
GitHub: https://github.com/Adeesha-Sandaruwan/MediStream

This document explains how to clone, build, and run all deliverables in this project.
It covers both:
1) Docker Compose (recommended for local development)
2) Kubernetes on Docker Desktop (required for orchestration deliverable)


Project Services
----------------
Backend microservices:
1. auth                (port 8081)
2. patient             (port 8082)
3. telemedicine        (port 8083)
4. doctor              (port 8084)
5. notification        (port 8085)
6. appointment         (port 8086)
7. payment             (port 8087)
8. symptom-checker     (port 8088)

Frontend:
- React (Vite) app in /frontend (usually runs on port 5173)


Prerequisites
-------------
Required:
1. Git
2. Docker Desktop (Linux containers mode)
3. Node.js + npm (for frontend)

For Kubernetes mode:
4. Kubernetes enabled in Docker Desktop
5. kubectl

Optional for local non-container dev:
6. Java 21
7. Maven


Clone the Project
-----------------
Open terminal and run:

  git clone https://github.com/Adeesha-Sandaruwan/MediStream
  cd MediStream


A) Docker Compose Deployment (Local Development)
================================================

Why use this mode:
- Fast local startup
- No manual kubectl port-forward commands
- Best for day-to-day development

1) Start all backend services and optional local postgres:

  docker compose up --build -d

2) Check service status:

  docker compose ps

3) View logs (examples):

  docker compose logs -f auth
  docker compose logs -f patient
  docker compose logs -f doctor

4) Start frontend:

  cd frontend
  npm install
  npm run dev

5) Stop services:

  docker compose stop

6) Stop and remove containers/network:

  docker compose down

7) Remove volumes too (warning: deletes local postgres data):

  docker compose down -v

Daily usage note:
- First time or after code changes in backend images:
    docker compose up --build -d
- If no backend code changes:
    docker compose up -d


B) Kubernetes Deployment (Docker Desktop Kubernetes)
====================================================

Why use this mode:
- Demonstrates microservice orchestration
- Assignment-ready Kubernetes deployment

Kubernetes files are in /k8s.

1) Ensure Kubernetes is enabled and context is correct:

  kubectl config use-context docker-desktop
  kubectl get nodes

2) Apply namespace and shared configs:

  kubectl apply -f k8s/namespace.yaml
  kubectl apply -f k8s/configmap.yaml

3) Create and apply secrets:

  Copy k8s/secret.example.yaml to k8s/secret.yaml and fill real values.

  Example:
    Copy-Item k8s/secret.example.yaml k8s/secret.yaml

  Then apply:
    kubectl apply -f k8s/secret.yaml

4) Deploy all services:

  kubectl apply -f k8s/services

5) Verify deployment:

  kubectl get pods -n medistream
  kubectl get svc -n medistream

6) Optional verification script:

  .\verify-k8s.ps1

7) To access services from localhost in Kubernetes mode:

  Run helper script:
    .\start-port-forwards.ps1

  Keep opened port-forward terminals running while using frontend.

8) Start frontend (same as compose mode):

  cd frontend
  npm install
  npm run dev


Ports and API Endpoints
-----------------------
Backend ports:
- http://localhost:8081  auth
- http://localhost:8082  patient
- http://localhost:8083  telemedicine
- http://localhost:8084  doctor
- http://localhost:8085  notification
- http://localhost:8086  appointment
- http://localhost:8087  payment
- http://localhost:8088  symptom-checker

Frontend:
- http://localhost:5173


Typical Startup Sequence (Recommended)
--------------------------------------
For developers:
1. docker compose up --build -d
2. docker compose ps
3. cd frontend && npm run dev

For assignment Kubernetes demo:
1. Build images (if not already present)
2. kubectl apply for k8s files
3. kubectl get pods -n medistream
4. .\start-port-forwards.ps1
5. Run frontend and demo flows


Troubleshooting
---------------
1) Error: dockerDesktopLinuxEngine pipe not found
- Cause: Docker engine not running
- Fix: Start/restart Docker Desktop and retry

2) Kubernetes pod CrashLoopBackOff
- Check logs:
    kubectl logs -n medistream deployment/<service-name>
- Check pod details:
    kubectl describe pod -n medistream <pod-name>
- Usually caused by missing/invalid secret values

3) Frontend cannot call backend in Kubernetes mode
- Ensure port-forwards are running
- Ensure pods are 1/1 Running

4) Compose mode not reflecting backend code changes
- Rebuild images:
    docker compose up --build -d


Deliverables Included
---------------------
- Dockerfiles for all backend services
- Root docker-compose.yml for full local startup
- Kubernetes manifests under /k8s
- Helper scripts:
  - verify-k8s.ps1
  - start-port-forwards.ps1


Contact/Group
-------------
Group ID: SE55
See members.txt for complete member information.
