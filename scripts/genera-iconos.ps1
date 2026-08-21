# Genera los iconos de la aplicación para Android (manifiesto web).
#
# Se dibujan con GDI+, que ya viene en Windows: así no hace falta ninguna
# dependencia nueva ni un diseñador. La identidad es la del sistema visual
# Classical: fondo de acento y, encima, un carrito de la compra trazado a mano
# con vectores.
#
# El carrito se dibuja en un lienzo de 100x100 unidades y se escala al lado que
# toque. Trazarlo, en vez de escribir un glifo, es lo que permite que salga
# igual de nítido a 192 y a 512 px sin depender de qué fuente haya instalada.
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
  @{ nombre = 'icono-192.png';          lado = 192; escala = 0.58; margen = $true  },
  @{ nombre = 'icono-512.png';          lado = 512; escala = 0.58; margen = $true  },
  @{ nombre = 'icono-512-maskable.png'; lado = 512; escala = 0.44; margen = $false }
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

  # El carrito se traza en unidades de 0 a 100 y se centra sobre su propio
  # contenido, que ocupa de 6 a 94 de ancho y de 16 a 88 de alto.
  $k = $lado * $v.escala / 100.0
  $g.TranslateTransform([single]($lado / 2 - $k * 50), [single]($lado / 2 - $k * 52))
  $g.ScaleTransform([single]$k, [single]$k)

  $tinta = New-Object System.Drawing.SolidBrush($claro)
  $pluma = New-Object System.Drawing.Pen($claro, [single]7)
  $pluma.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pluma.EndCap   = [System.Drawing.Drawing2D.LineCap]::Round
  $pluma.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round

  # El asa y la cesta, en un solo trazo continuo.
  $carro = New-Object System.Drawing.Drawing2D.GraphicsPath
  $carro.AddLine(6, 16, 17, 16)    # el asa
  $carro.AddLine(17, 16, 26, 30)   # la caída hasta la esquina de atrás
  $carro.AddLine(26, 30, 94, 30)   # el borde de arriba
  $carro.AddLine(94, 30, 82, 64)   # el lado de delante
  $carro.AddLine(82, 64, 40, 64)   # el fondo
  $carro.AddLine(40, 64, 26, 30)   # el lado de atrás, que cierra la cesta
  $g.DrawPath($pluma, $carro)

  # Las ruedas van macizas: a 192 px el hueco de un aro se cierra solo y lo que
  # se ve es un borrón.
  $g.FillEllipse($tinta, 41, 74, 14, 14)
  $g.FillEllipse($tinta, 69, 74, 14, 14)

  $g.ResetTransform()

  $bmp.Save((Join-Path $destino $v.nombre), [System.Drawing.Imaging.ImageFormat]::Png)

  $carro.Dispose(); $pluma.Dispose(); $tinta.Dispose()
  $fondo.Dispose(); $g.Dispose(); $bmp.Dispose()

  Write-Output "$($v.nombre)  ${lado}x${lado}"
}
