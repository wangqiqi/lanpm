import assert from 'node:assert/strict'
import { UDP_DISCOVERY_PORT, UDP_MULTICAST_ADDR } from '../src/shared/network/constants.ts'

assert.equal(UDP_DISCOVERY_PORT, 43_123)
assert.match(UDP_MULTICAST_ADDR, /^239\.\d+\.\d+\.\d+$/)

console.log('verify:network-multicast OK')
