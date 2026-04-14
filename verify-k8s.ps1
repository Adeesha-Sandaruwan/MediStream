$ErrorActionPreference = 'Stop'

function Write-Section($title) {
    Write-Host "`n==================== $title ====================" -ForegroundColor Cyan
}

Write-Section 'Docker Images'
docker image ls --format "table {{.Repository}}`t{{.Tag}}`t{{.ID}}`t{{.Size}}" | Select-String 'medistream-'

Write-Section 'Kubernetes Context'
kubectl config current-context
kubectl get nodes

Write-Section 'Kubernetes Pods'
kubectl get pods -n medistream

Write-Section 'Kubernetes Services'
kubectl get svc -n medistream

Write-Section 'Readiness Check'
$pods = kubectl get pods -n medistream --no-headers 2>$null
if (-not $pods) {
    throw 'No pods found in namespace medistream.'
}

$notReady = @()
foreach ($line in $pods) {
    $parts = ($line -replace '\s+', ' ').Trim().Split(' ')
    if ($parts.Count -lt 3) { continue }
    $name = $parts[0]
    $ready = $parts[1]
    $status = $parts[2]
    if ($ready -ne '1/1' -or $status -ne 'Running') {
        $notReady += $name
    }
}

if ($notReady.Count -gt 0) {
    Write-Host 'Not ready pods:' -ForegroundColor Yellow
    $notReady | ForEach-Object { Write-Host " - $_" -ForegroundColor Yellow }
} else {
    Write-Host 'All pods are Running and Ready.' -ForegroundColor Green
}

Write-Section 'Optional Auth Smoke Test'
Write-Host 'To test auth service, run this in a second terminal:' -ForegroundColor White
Write-Host 'kubectl port-forward -n medistream svc/auth-service 8081:8081' -ForegroundColor Gray
Write-Host ''
Write-Host 'Then run this in PowerShell:' -ForegroundColor White
Write-Host @'
$body = @{ email = "k8s-patient-01@medistream.test"; password = "Test@123456"; role = "PATIENT" } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "http://localhost:8081/api/auth/register" -ContentType "application/json" -Body $body
'@ -ForegroundColor Gray
Write-Host ''
Write-Host 'If you already created the test user, use login instead:' -ForegroundColor White
Write-Host @'
$login = @{ email = "k8s-patient-01@medistream.test"; password = "Test@123456" } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "http://localhost:8081/api/auth/authenticate" -ContentType "application/json" -Body $login
'@ -ForegroundColor Gray
