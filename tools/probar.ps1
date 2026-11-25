# Prueba local de Caja Común con datos simulados (tools/mock.js).
# Uso:  powershell -ExecutionPolicy Bypass -File tools\probar.ps1
# Luego abre http://localhost:8765/  (Ctrl+C para cerrar)
param([int]$Puerto = 8765)

$raiz = [IO.Path]::GetFullPath((Split-Path $PSScriptRoot -Parent))
$tipos = @{ '.html' = 'text/html; charset=utf-8'; '.css' = 'text/css; charset=utf-8'; '.js' = 'text/javascript; charset=utf-8'; '.json' = 'application/json' }
$l = New-Object Net.HttpListener
$l.Prefixes.Add("http://localhost:$Puerto/")
$l.Start()
Write-Host "Prueba local en http://localhost:$Puerto/  (Ctrl+C para cerrar)"
try {
  while ($l.IsListening) {
    $c = $l.GetContext()
    $ruta = [Uri]::UnescapeDataString($c.Request.Url.AbsolutePath.TrimStart('/'))
    if ($ruta -eq '' -or $ruta -eq 'index.html') {
      $pagina = [IO.File]::ReadAllText((Join-Path $raiz 'index.html'), [Text.Encoding]::UTF8)
      $html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}</style><script src="tools/mock.js"></script></head><body>' + $pagina + '</body></html>'
      $bytes = [Text.Encoding]::UTF8.GetBytes($html)
      $c.Response.ContentType = $tipos['.html']
    } else {
      $full = [IO.Path]::GetFullPath((Join-Path $raiz $ruta))
      if (-not $full.StartsWith($raiz) -or -not (Test-Path -LiteralPath $full -PathType Leaf)) { $c.Response.StatusCode = 404; $c.Response.Close(); continue }
      $bytes = [IO.File]::ReadAllBytes($full)
      $ext = [IO.Path]::GetExtension($full)
      if ($tipos.ContainsKey($ext)) { $c.Response.ContentType = $tipos[$ext] }
    }
    $c.Response.Headers.Add('Cache-Control', 'no-store')
    try {
      $c.Response.ContentLength64 = $bytes.Length
      if ($c.Request.HttpMethod -ne 'HEAD') { $c.Response.OutputStream.Write($bytes, 0, $bytes.Length) }
      $c.Response.Close()
    } catch { try { $c.Response.Abort() } catch {} }
  }
} finally { $l.Stop() }
