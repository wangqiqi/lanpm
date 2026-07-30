import {
  test,
  dismissAllModals
} from './fixtures/dualElectron.ts'
import {
  startSharingPairingCode,
  joinWithPairingCode,
  joinWithPairingCodeCrossSubnet,
  expectPairingJoinSuccess
} from './fixtures/pairing.ts'

test.describe.configure({ mode: 'serial' })

test.describe('pairing dual-instance E2E', () => {
  test.afterEach(async ({ hostPage, joinerPage }) => {
    await dismissAllModals(hostPage)
    await dismissAllModals(joinerPage)
  })

  test('host shares code and joiner connects on same subnet', async ({ hostPage, joinerPage }) => {
    const code = await startSharingPairingCode(hostPage)
    await joinWithPairingCode(joinerPage, code)
    await expectPairingJoinSuccess(joinerPage, 'E2EHost')
  })

  test('host shares code and joiner connects with cross-subnet flag', async ({
    hostPage,
    joinerPage
  }) => {
    const code = await startSharingPairingCode(hostPage)

    await joinWithPairingCodeCrossSubnet(joinerPage, code)
    await expectPairingJoinSuccess(joinerPage, 'E2EHost')
  })
})
