# Git Bash must call this with -File (not -Command -).
# Inline $_ inside bash double quotes expands to expand_aliases and dumps GBK mojibake.
param([switch]$Stop)
$utf8 = New-Object System.Text.UTF8Encoding $false
try {
  [Console]::OutputEncoding = $utf8
} catch {}
Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue |
  Where-Object { $_.CommandLine -match 'electron-vite' -and $_.CommandLine -match 'lanpm' } |
  ForEach-Object {
    if ($Stop) {
      Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
    } else {
      Write-Output ($_.ProcessId.ToString() + ' ' + $_.CommandLine)
    }
  }
