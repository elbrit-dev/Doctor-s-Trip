# Serve this folder locally so the landing page (and Tally embed) work over http.
# Usage:  powershell -ExecutionPolicy Bypass -File .\serve-static.ps1
# Then open the URL it prints (default http://localhost:8080).

param([int]$Port = 8080)

$root = $PSScriptRoot
Add-Type -AssemblyName System.Net.HttpListener -ErrorAction SilentlyContinue

$listener = New-Object System.Net.HttpListener
$prefix = "http://localhost:$Port/"
$listener.Prefixes.Add($prefix)

try { $listener.Start() }
catch { Write-Host "Could not bind to $prefix. Try another port: .\serve-static.ps1 -Port 9090" -ForegroundColor Red; return }

Write-Host ""
Write-Host "  Elbrit landing page is live at:" -ForegroundColor Green
Write-Host "  $prefix" -ForegroundColor Cyan
Write-Host "  (Ctrl+C to stop)`n" -ForegroundColor DarkGray

$mime = @{ ".html"="text/html"; ".js"="application/javascript"; ".css"="text/css"; ".png"="image/png"; ".jpg"="image/jpeg"; ".svg"="image/svg+xml"; ".ico"="image/x-icon" }

while ($listener.IsListening) {
    try {
        $ctx = $listener.GetContext()
        $path = $ctx.Request.Url.LocalPath.TrimStart('/')
        if ([string]::IsNullOrWhiteSpace($path)) { $path = "index.html" }
        $file = Join-Path $root $path

        if (Test-Path $file -PathType Leaf) {
            $bytes = [System.IO.File]::ReadAllBytes($file)
            $ext = [System.IO.Path]::GetExtension($file).ToLower()
            if ($mime.ContainsKey($ext)) { $ctx.Response.ContentType = $mime[$ext] }
            $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $ctx.Response.StatusCode = 404
            $msg = [Text.Encoding]::UTF8.GetBytes("404 - $path not found")
            $ctx.Response.OutputStream.Write($msg, 0, $msg.Length)
        }
        $ctx.Response.OutputStream.Close()
    } catch { }
}
