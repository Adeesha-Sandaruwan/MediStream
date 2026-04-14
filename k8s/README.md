# MediStream Kubernetes Deployment

## 1) Create namespace and shared config

```powershell
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
```

## 2) Create real secret file from template

Copy `k8s/secret.example.yaml` to `k8s/secret.yaml` and replace placeholders with real values.

```powershell
Copy-Item k8s/secret.example.yaml k8s/secret.yaml
```

Then edit `k8s/secret.yaml` and apply:

```powershell
kubectl apply -f k8s/secret.yaml
```

## 3) Deploy all 8 services

```powershell
kubectl apply -f k8s/services/auth.yaml
kubectl apply -f k8s/services/patient.yaml
kubectl apply -f k8s/services/doctor.yaml
kubectl apply -f k8s/services/appointment.yaml
kubectl apply -f k8s/services/payment.yaml
kubectl apply -f k8s/services/notification.yaml
kubectl apply -f k8s/services/telemedicine.yaml
kubectl apply -f k8s/services/symptom-checker.yaml
```

## 4) Verify

```powershell
kubectl get pods -n medistream
kubectl get svc -n medistream
```

## 5) Check logs for a service

```powershell
kubectl logs -n medistream deployment/auth
kubectl logs -n medistream deployment/patient
```

## 6) Local access with port-forward

```powershell
kubectl port-forward -n medistream svc/auth-service 8081:8081
kubectl port-forward -n medistream svc/patient-service 8082:8082
kubectl port-forward -n medistream svc/doctor-service 8084:8084
kubectl port-forward -n medistream svc/appointment-service 8086:8086
kubectl port-forward -n medistream svc/payment-service 8087:8087
kubectl port-forward -n medistream svc/notification-service 8085:8085
kubectl port-forward -n medistream svc/telemedicine-service 8083:8083
kubectl port-forward -n medistream svc/symptom-checker-service 8088:8088
```

## 7) Cleanup

```powershell
kubectl delete namespace medistream
```
