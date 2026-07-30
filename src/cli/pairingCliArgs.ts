export interface PairingCliJoinOptions {
  code: string
  crossSubnet?: boolean
  host?: string
}

export function parsePairingCliArgs(argv: string[]): {
  command: 'start' | 'join' | 'help'
  join?: PairingCliJoinOptions
} {
  const args = [...argv]
  if (args.length === 0 || args[0] === 'help' || args[0] === '--help' || args[0] === '-h') {
    return { command: 'help' }
  }
  if (args[0] !== 'pairing') {
    throw new Error(`unknown_command:${args[0] ?? ''}`)
  }
  const sub = args[1]
  if (sub === 'start') {
    return { command: 'start' }
  }
  if (sub === 'join') {
    const code = args[2]
    if (!code) throw new Error('pairing_code_required')
    let crossSubnet = false
    let host: string | undefined
    for (let i = 3; i < args.length; i++) {
      const token = args[i]
      if (token === '--cross-subnet') {
        crossSubnet = true
        continue
      }
      if (token === '--host') {
        host = args[++i]
        if (!host) throw new Error('pairing_host_required')
        continue
      }
      throw new Error(`unknown_flag:${token}`)
    }
    return { command: 'join', join: { code, crossSubnet, host } }
  }
  throw new Error(`unknown_pairing_subcommand:${sub ?? ''}`)
}

export function pairingCliHelp(): string {
  return [
    'LanPM pairing CLI',
    '',
    '  lanpm pairing start',
    '  lanpm pairing join <code> [--cross-subnet] [--host <ip-or-tail>]',
    ''
  ].join('\n')
}
