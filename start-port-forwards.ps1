$ErrorActionPreference = 'Stop'

$forwards = @(
    @{ Name = 'auth'; Namespace = 'medistream'; Service = 'auth-service'; LocalPort = 8081; RemotePort = 8081 },
    @{ Name = 'patient'; Namespace = 'medistream'; Service = 'patient-service'; LocalPort = 8082; RemotePort = 8082 },
    @{ Name = 'telemedicine'; Namespace = 'medistream'; Service = 'telemedicine-service'; LocalPort = 8083; RemotePort = 8083 },
    @{ Name = 'doctor'; Namespace = 'medistream'; Service = 'doctor-service'; LocalPort = 8084; RemotePort = 8084 },
    @{ Name = 'notification'; Namespace = 'medistream'; Service = 'notification-service'; LocalPort = 8085; RemotePort = 8085 },
    @{ Name = 'appointment'; Namespace = 'medistream'; Service = 'appointment-service'; LocalPort = 8086; RemotePort = 8086 },
    @{ Name = 'payment'; Namespace = 'medistream'; Service = 'payment-service'; LocalPort = 8087; RemotePort = 8087 },
    @{ Name = 'symptom-checker'; Namespace = 'medistream'; Service = 'symptom-checker-service'; LocalPort = 8088; RemotePort = 8088 }
)

Write-Host "Checking Kubernetes context..." -ForegroundColor Cyan
$context = kubectl config current-context
if (-not $context) {
    throw 'kubectl context not found. Start Docker Desktop Kubernetes first.'
}
Write-Host "Current context: $context" -ForegroundColor Green

Write-Host "Checking pods in namespace medistream..." -ForegroundColor Cyan
kubectl get pods -n medistream | Out-Host

foreach ($f in $forwards) {
    $command = "Write-Host 'Port-forward: $($f.Name) ($($f.LocalPort) -> $($f.RemotePort))' -ForegroundColor Green; " +
               "kubectl port-forward -n $($f.Namespace) svc/$($f.Service) $($f.LocalPort):$($f.RemotePort)"

    Start-Process -FilePath "powershell.exe" -ArgumentList @(
        "-NoExit",
        "-ExecutionPolicy", "Bypass",
        "-Command", $command
    ) | Out-Null
}

Write-Host "All 8 port-forward windows launched." -ForegroundColor Green
Write-Host "Keep those windows open while using the frontend." -ForegroundColor Yellow
