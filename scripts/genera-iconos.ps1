# Genera los iconos de la aplicación para Android (manifiesto web).
#
# Se dibujan con GDI+, que ya viene en Windows: así no hace falta ninguna
# dependencia nueva ni un diseñador. La identidad es la del sistema visual
# Classical: fondo de acento y un glifo «€» en serif, que es el mismo signo que
# usa la interfaz.
#
#   powershell -ExecutionPolicy Bypass -File scripts/genera-iconos.ps1

Add-Type -AssemblyName System.Drawing

$destino = Join-Path $PSScriptRoot '..\public'
if (-not (Test-Path $destino)) { New-Item -ItemType Directory -Path $destino | Out-Null }

$acento = [System.Drawing.ColorTranslator]::FromHtml('#b68235')
$claro  = [System.Drawing.ColorTranslator]::FromHtml('#fff3e4')

# 'any'      -> el icono se ve entero, con su propio margen.
# 'maskable' -> Android lo recorta en círculo, así que el glifo va más pequeño
#               y el color llega hasta el borde: la zona segura es el 80%.
$variantes = @(
  @{ nombre = 'icono-192.png';          lado = 192; escala = 0.62; margen = $true  },
  @{ nombre = 'icono-512.png';          lado = 512; escala = 0.62; margen = $true  },
  @{ nombre = 'icono-512-maskable.png'; lado = 512; escala = 0.45; margen = $false }
)

foreach ($v in $variantes) {
  $lado = [int]$v.lado
  $bmp  = New-Object System.Drawing.Bitmap($lado, $lado)
  $g    = [System.Drawing.Graphics]::FromImage($bmp)

  $g.SmoothingMode     = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

  $fondo = New-Object System.Drawing.SolidBrush($acento)
  if ($v.margen) {
    # Cuadrado redondeado, como el resto de superficies de la interfaz.
    $g.Clear([System.Drawing.Color]::Transparent)
    $r    = [int]($lado * 0.22)
    $ruta = New-Object System.Drawing.Drawing2D.GraphicsPath
    $d    = $r * 2
    $ruta.AddArc(0, 0, $d, $d, 180, 90)
    $ruta.AddArc($lado - $d, 0, $d, $d, 270, 90)
    $ruta.AddArc($lado - $d, $lado - $d, $d, $d, 0, 90)
    $ruta.AddArc(0, $lado - $d, $d, $d, 90, 90)
    $ruta.CloseFigure()
    $g.FillPath($fondo, $ruta)
    $ruta.Dispose()
  } else {
    $g.FillRectangle($fondo, 0, 0, $lado, $lado)
  }

  $fuente = New-Object System.Drawing.Font('Georgia', [single]($lado * $v.escala),
                                           [System.Drawing.FontStyle]::Regular,
                                           [System.Drawing.GraphicsUnit]::Pixel)
  $tinta  = New-Object System.Drawing.SolidBrush($claro)
  $centro = New-Object System.Drawing.StringFormat
  $centro.Alignment     = [System.Drawing.StringAlignment]::Center
  $centro.LineAlignment = [System.Drawing.StringAlignment]::Center

  $caja = New-Object System.Drawing.RectangleF(0, 0, $lado, $lado)
  $g.DrawString([char]0x20AC, $fuente, $tinta, $caja, $centro)

  $bmp.Save((Join-Path $destino $v.nombre), [System.Drawing.Imaging.ImageFormat]::Png)

  $centro.Dispose(); $tinta.Dispose(); $fuente.Dispose()
  $fondo.Dispose(); $g.Dispose(); $bmp.Dispose()

  Write-Output "$($v.nombre)  ${lado}x${lado}"
}
