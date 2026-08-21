# Copia de seguridad completa del proyecto de Supabase.
#
# El plan gratuito NO hace copias automáticas ni tiene recuperación a un punto
# en el tiempo: eso empieza en Pro. Lo que sí se puede es volcar la base uno
# mismo cuando quiera, que es lo que hace esto.
#
# Deja, en `copias\AAAA-MM-DD-HHmm\`:
#
#   esquema.sql      DDL del esquema `public` (tablas, tipos, índices, RLS)
#   datos.sql        filas del esquema `public`, en INSERT
#   imagenes.txt     inventario de los ficheros del cubo `imagenes`
#   imagenes\...     las fotos y logos, descargadas de verdad
#
# Los dos ficheros últimos importan: `pg_dump` del esquema `public` NO se lleva
# las imágenes. Viven en Storage, que por dentro es el esquema `storage` (y los
# bytes ni siquiera están en la base). Sin esta segunda mitad la copia parece
# completa y no lo es.
#
#   powershell -ExecutionPolicy Bypass -File scripts/copia-seguridad.ps1
#
# La contraseña es la de la base de datos —Project Settings -> Database-> y se
# teclea en el momento, no se guarda en ningún sitio. Si prefieres no teclearla
# cada vez, ponla en la variable de entorno SUPABASE_DB_PASSWORD.

param(
  # Región del «pooler» de Supabase. Solo hace falta si la detección falla.
  [string] $Region,
  # Contraseña de la base. Mejor no usarlo: queda en el historial de la consola.
  [string] $Password
)

$ErrorActionPreference = 'Stop'
$raiz = Resolve-Path (Join-Path $PSScriptRoot '..')


# --- Las herramientas -------------------------------------------------------
#
# `supabase db dump` no vale aquí: no lleva `pg_dump` dentro, lo ejecuta dentro
# de un contenedor, y eso obliga a tener Docker instalado para volcar una base
# que está en internet. Se usa el `pg_dump` de los binarios portables que hay
# en `herramientas\` (ver README).

$bin = Join-Path $raiz 'herramientas\pgsql\bin'
$pgDump = Join-Path $bin 'pg_dump.exe'
$psql   = Join-Path $bin 'psql.exe'

if (-not (Test-Path $pgDump)) {
  throw "No encuentro pg_dump en $bin. Descarga los binarios de PostgreSQL 17 " +
        "(https://get.enterprisedb.com/postgresql/postgresql-17.7-1-windows-x64-binaries.zip) " +
        "y descomprime la carpeta 'pgsql' dentro de 'herramientas\'."
}


# --- Qué proyecto ------------------------------------------------------------

$env_ = Join-Path $raiz '.env'
if (-not (Test-Path $env_)) { throw "No hay .env: no sé a qué proyecto conectarme." }

$url = (Get-Content $env_ | Select-String '^VITE_SUPABASE_URL=').ToString().Split('=', 2)[1].Trim()
$ref = ([uri]$url).Host.Split('.')[0]
Write-Host "Proyecto: $ref" -ForegroundColor Cyan


# --- Cómo se llega hasta la base ---------------------------------------------
#
# La conexión directa (db.<ref>.supabase.co) es hoy SOLO IPv6 en el plan
# gratuito, y una red doméstica española normal no tiene IPv6 de salida: el
# puerto 5432 no llega a abrirse nunca. Por eso se va por el «pooler», que sí
# escucha en IPv4. El pooler cuelga de la región del proyecto, y la región no
# se puede sacar de la URL pública, así que se prueban las candidatas por orden
# hasta que una autentica.

$usuario = "postgres.$ref"

if ($Password) {
  $clave = $Password
} elseif ($env:SUPABASE_DB_PASSWORD) {
  $clave = $env:SUPABASE_DB_PASSWORD
  Write-Host "Contraseña tomada de SUPABASE_DB_PASSWORD." -ForegroundColor DarkGray
} else {
  $segura = Read-Host "Contraseña de la base de datos" -AsSecureString
  $clave  = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
              [Runtime.InteropServices.Marshal]::SecureStringToBSTR($segura))
}
if (-not $clave) { throw "Sin contraseña no hay copia." }

# La primera es la de este proyecto (aws-1-eu-west-1), averiguada probando: el
# resto está por si algún día se recrea el proyecto en otro sitio.
$regiones = if ($Region) { @($Region) } else {
  @('eu-west-1', 'eu-central-1', 'eu-west-2', 'eu-west-3', 'eu-central-2',
    'us-east-1', 'us-east-2', 'us-west-1', 'sa-east-1', 'ap-southeast-1')
}

# Cada región vive en un `aws-N`; el número cambió con el tiempo y no hay forma
# de saber cuál toca sin probar.
$env:PGPASSWORD = $clave
$env:PGCONNECT_TIMEOUT = '10'
$servidor = $null

# Un `psql` que no conecta escribe en la salida de error, y PowerShell 5.1
# convierte eso en un error terminante aunque el programa no haya fallado. Por
# eso el sondeo baja la guardia y mira el texto, que además distingue los dos
# noes: «tenant/user not found» es región equivocada, y «password
# authentication failed» es la región buena con la contraseña mal.
$antes = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
$claveMal = $false

foreach ($r in $regiones) {
  foreach ($n in @(0, 1)) {
    $host_ = "aws-$n-$r.pooler.supabase.com"
    if (-not (Resolve-DnsName -Name $host_ -Type A -ErrorAction SilentlyContinue)) { continue }

    Write-Host "  probando $host_ ..." -ForegroundColor DarkGray
    $dicho = (& $psql --host $host_ --port 5432 --username $usuario --dbname postgres `
                      --no-password --quiet --tuples-only --command 'select 1' 2>&1) -join ' '
    if ($LASTEXITCODE -eq 0) { $servidor = $host_; break }
    if ($dicho -match 'password authentication failed') { $claveMal = $true; break }
  }
  if ($servidor -or $claveMal) { break }
}

$ErrorActionPreference = $antes

if ($claveMal) { throw "La contraseña de la base no es esa." }
if (-not $servidor) {
  throw "No he podido conectar por ninguna región. Mira en el panel " +
        "(Project Settings -> Database -> Connection string -> Session pooler) " +
        "cuál es el servidor y vuelve a lanzarlo con -Region <la que salga ahí>."
}
Write-Host "Conectado por $servidor" -ForegroundColor Green

$comunes = @('--host', $servidor, '--port', '5432', '--username', $usuario, '--dbname', 'postgres', '--no-password')


# --- Dónde se guarda ---------------------------------------------------------

$sello   = Get-Date -Format 'yyyy-MM-dd-HHmm'
$destino = Join-Path $raiz "copias\$sello"
New-Item -ItemType Directory -Force -Path $destino | Out-Null


# --- 1. El esquema -----------------------------------------------------------
#
# Solo `public`: los esquemas `auth`, `storage`, `realtime` y demás los mantiene
# la plataforma y ni siquiera se pueden volcar sin ser superusuario. Lo nuestro
# —tablas, `citext`, índices, políticas RLS— está todo en `public`.

Write-Host "Volcando el esquema..."
& $pgDump @comunes --schema public --schema-only --no-owner --no-privileges `
          --file (Join-Path $destino 'esquema.sql')
if ($LASTEXITCODE -ne 0) { throw "pg_dump falló al volcar el esquema." }


# --- 2. Los datos ------------------------------------------------------------
#
# `--column-inserts` en vez de COPY: es más lento y más largo, pero se lee, se
# puede corregir a mano y se puede pegar por trozos en el editor SQL del panel,
# que es como se va a restaurar esto si algún día hace falta.

Write-Host "Volcando los datos..."
& $pgDump @comunes --schema public --data-only --column-inserts --no-owner `
          --file (Join-Path $destino 'datos.sql')
if ($LASTEXITCODE -ne 0) { throw "pg_dump falló al volcar los datos." }


# --- 3. Las imágenes ---------------------------------------------------------
#
# El inventario sale de `storage.objects`, que sí se puede leer con la conexión
# de administración. Los bytes se bajan por la URL pública del cubo: `imagenes`
# es público a propósito (ver migración 04), así que no hace falta firmar nada.

Write-Host "Inventariando el cubo 'imagenes'..."
$lista = & $psql @comunes --tuples-only --no-align --command `
  "select name from storage.objects where bucket_id = 'imagenes' order by name"
if ($LASTEXITCODE -ne 0) { throw "psql falló al listar los ficheros del cubo." }

$nombres = @($lista | Where-Object { $_ -and $_.Trim() })
# Sin BOM: `Set-Content -Encoding utf8` en PowerShell 5.1 lo mete, y esos tres
# bytes se pegan al primer nombre de la lista.
[IO.File]::WriteAllLines((Join-Path $destino 'imagenes.txt'), $nombres,
                         (New-Object Text.UTF8Encoding($false)))

$bajadas = 0
foreach ($nombre in $nombres) {
  # Los nombres llevan acentos y espacios (son nombres de producto plegados a
  # minúsculas), así que hay que escapar segmento a segmento.
  $ruta = ($nombre.Split('/') | ForEach-Object { [uri]::EscapeDataString($_) }) -join '/'
  $desde = "$url/storage/v1/object/public/imagenes/$ruta"
  $hasta = Join-Path $destino "imagenes\$($nombre -replace '/', '\')"
  New-Item -ItemType Directory -Force -Path (Split-Path $hasta) | Out-Null
  try {
    Invoke-WebRequest -Uri $desde -OutFile $hasta -UseBasicParsing -TimeoutSec 60
    $bajadas++
  } catch {
    Write-Host "  no se pudo bajar $nombre" -ForegroundColor Yellow
  }
}

$env:PGPASSWORD = $null


# --- Resumen -----------------------------------------------------------------

$tam = [math]::Round(((Get-ChildItem $destino -Recurse -File | Measure-Object Length -Sum).Sum / 1MB), 2)
Write-Host ""
Write-Host "Copia hecha en copias\$sello" -ForegroundColor Green
Write-Host ("  esquema.sql   {0} KB" -f [math]::Round((Get-Item (Join-Path $destino 'esquema.sql')).Length / 1KB, 1))
Write-Host ("  datos.sql     {0} KB" -f [math]::Round((Get-Item (Join-Path $destino 'datos.sql')).Length / 1KB, 1))
Write-Host ("  imagenes      {0} de {1} ficheros" -f $bajadas, $nombres.Count)
Write-Host ("  total         {0} MB" -f $tam)
