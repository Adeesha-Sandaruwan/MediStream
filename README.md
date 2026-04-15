<img width="1891" height="942" alt="image" src="https://github.com/user-attachments/assets/19a8d555-e69e-410a-b80e-75888434b6f1" />

# MediStream

Healthcare appointment and telemedicine platform built with Spring Boot microservices and a React frontend.

## Repository

- GitHub: https://github.com/Adeesha-Sandaruwan/MediStream

## Services

Backend microservices:

1. auth (8081)
2. patient (8082)
3. telemedicine (8083)
4. doctor (8084)
5. notification (8085)
6. appointment (8086)
7. payment (8087)
8. symptom-checker (8088)

Frontend:

- React (Vite) in `frontend` (default: 5173)

## Prerequisites

Required:

1. Git
2. Docker Desktop (Linux containers mode)
3. Node.js and npm

For Kubernetes mode:

4. Kubernetes enabled in Docker Desktop
5. kubectl

Optional for non-container local runs:

6. Java 21
7. Maven

## Clone

```bash
git clone https://github.com/Adeesha-Sandaruwan/MediStream
cd MediStream
```

## Option A: Docker Compose (Recommended for Daily Development)

### Start all backend services

```bash
docker compose up --build -d
```

### Check status

```bash
docker compose ps
```

### View logs

```bash
docker compose logs -f auth
docker compose logs -f patient
docker compose logs -f doctor
```

### Start frontend

```bash
cd frontend
npm install
npm run dev
```

### Stop services

```bash
docker compose stop
```

### Remove containers and network

```bash
docker compose down
```

### Remove volumes (deletes local postgres data)

```bash
docker compose down -v
```

Daily usage:

- After backend code changes: `docker compose up --build -d`
- Without backend changes: `docker compose up -d`

## Option B: Kubernetes (Docker Desktop)

Kubernetes manifests are in `k8s`.

### 1. Ensure context

```bash
kubectl config use-context docker-desktop
kubectl get nodes
```

### 2. Apply namespace and config

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
```

### 3. Create/apply secret

Copy `k8s/secret.example.yaml` to `k8s/secret.yaml`, fill values, then:

```powershell
kubectl apply -f k8s/secret.yaml
```

### 4. Deploy services

```bash
kubectl apply -f k8s/services
```

### 5. Verify

```bash
kubectl get pods -n medistream
kubectl get svc -n medistream
```

Optional:

```powershell
.\verify-k8s.ps1
```

### 6. Port-forward for localhost frontend calls

```powershell
.\start-port-forwards.ps1
```

Keep those terminal windows running while testing from frontend.

### 7. Start frontend

```bash
cd frontend
npm install
npm run dev
```

## Local Endpoints

Backend:

- http://localhost:8081 (auth)
- http://localhost:8082 (patient)
- http://localhost:8083 (telemedicine)
- http://localhost:8084 (doctor)
- http://localhost:8085 (notification)
- http://localhost:8086 (appointment)
- http://localhost:8087 (payment)
- http://localhost:8088 (symptom-checker)

Frontend:

- http://localhost:5173

## Troubleshooting

1. Docker engine pipe error (`dockerDesktopLinuxEngine` not found)
   - Start/restart Docker Desktop.
2. Pod in `CrashLoopBackOff`
   - Check logs: `kubectl logs -n medistream deployment/<service-name>`
   - Check details: `kubectl describe pod -n medistream <pod-name>`
   - Most often caused by missing/invalid secret values.
3. Frontend cannot reach backend in Kubernetes mode
   - Confirm port-forward terminals are running.
   - Confirm pods are `1/1 Running`.
4. Compose mode not reflecting backend changes
   - Rebuild: `docker compose up --build -d`

## Deliverables Included

- Dockerfiles for all backend services
- Root `docker-compose.yml` for full local startup
- Kubernetes manifests in `k8s`
- Helper scripts:
  - `verify-k8s.ps1`
  - `start-port-forwards.ps1`

## Group

- Group ID: SE55
- Member list: see `members.txt`
