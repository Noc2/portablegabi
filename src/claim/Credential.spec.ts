import {
  attestationSetup,
  mixedAttestationsSetup,
  actorSetup,
} from '../testSetup/testSetup'
import Claimer from './Claimer'
import Attester from '../attestation/Attester'
import {
  Attestation,
  InitiateAttestationRequest,
  AttesterAttestationSession,
  Witness,
} from '../types/Attestation'
import { ClaimerAttestationSession, AttestationRequest } from '../types/Claim'
import Accumulator from '../attestation/Accumulator'
import Credential from './Credential'

describe('Test claimer functionality', () => {
  let claimer: Claimer
  let attester: Attester
  let accumulator: Accumulator
  let initiateAttestationReq: InitiateAttestationRequest
  let attesterSession: AttesterAttestationSession
  let claimerSession: ClaimerAttestationSession
  let attestationRequest: AttestationRequest
  let witness: Witness
  let attestation: Attestation
  let credential: Credential
  let attester2: Attester
  let accumulator2: Accumulator
  const dateBefore = new Date()

  // get data from testSetup
  beforeAll(async () => {
    ;({
      claimers: [claimer],
      attesters: [attester],
      accumulators: [accumulator],
    } = await actorSetup())
    ;({
      initiateAttestationReq,
      attesterSession,
      claimerSession,
      attestationRequest,
      attestation,
      witness,
      credential,
    } = await attestationSetup({
      claimer,
      attester,
      accumulator,
    }))
    credential = await claimer.buildCredential({
      claimerSession,
      attestation,
    })
    ;({ attester2, accumulator2 } = await mixedAttestationsSetup({
      claimer,
      attester,
      accumulator,
      initiateAttestationReq,
      attesterSession,
      attestationRequest,
    }))
  }, 20000)

  // run tests on valid data
  describe('Positive tests', () => {
    it('Should return the date', () => {
      const dateCred = credential.getDate()
      expect(dateCred).toEqual(expect.anything())
      expect(
        Math.abs(dateCred.getTime() - dateBefore.getTime())
      ).toBeLessThanOrEqual(10000)
    })
    it('Updates single credential and compares both versions (without revoking)', async () => {
      const updatedCred = await credential.updateSingle({
        attesterPubKey: attester.publicKey,
        accumulator,
      })
      expect(updatedCred).toBeDefined()
      expect(credential).toBeDefined()
      expect(updatedCred).toStrictEqual(credential)
    })
    it('Should throw when updating a revoked credential', async () => {
      const revUpdate = await attester.revokeAttestation({
        accumulator,
        witnesses: [witness],
      })
      expect(revUpdate).toBeDefined()
      await expect(
        credential.update({
          attesterPubKey: attester.publicKey,
          accumulators: [revUpdate],
        })
      ).rejects.toThrowError('revoked')
    })
  })
  describe('Test updating with multiple accumulators', () => {
    let witnesses: Witness[]
    let accumulators: Accumulator[]
    const limit = 4
    beforeAll(async () => {
      // create witnesses that will be revoked
      witnesses = (
        await Promise.all(
          new Array(limit).fill(1).map(() =>
            attestationSetup({
              claimer,
              attester,
              accumulator,
            })
          )
        )
      ).map(x => x.witness)
      // revoke witnesses
      const accRev1 = await attester.revokeAttestation({
        accumulator,
        witnesses: [witnesses[0]],
      })
      const accRev2 = await attester.revokeAttestation({
        accumulator: accRev1,
        witnesses: [witnesses[1]],
      })

      const accRev3 = await attester.revokeAttestation({
        accumulator: accRev2,
        witnesses: witnesses.slice(2, limit),
      })
      accumulators = [accRev1, accRev2, accRev3]
    })
    it('Should throw when updating credential while skipping accumulator versions (revIndex 1 to 5)', async () => {
      // expect failure when updating from revIndex === 0 to revIndex === limit
      await expect(
        credential.update({
          attesterPubKey: attester.publicKey,
          accumulators: [accumulators[2]],
        })
      ).rejects.toThrowError('update too new')
    })
    it('Should not throw when updating credential from sorted accumulator array', async () => {
      const oldCount = credential.getUpdateCounter()
      const newCred = await credential.update({
        attesterPubKey: attester.publicKey,
        accumulators,
      })
      expect(newCred).toEqual(expect.anything())
      const newCount = newCred.getUpdateCounter()
      expect(newCount).toEqual(oldCount + accumulators.length)
    })
    it('Should not throw when updating credential from unsorted accumulator array', async () => {
      await expect(
        credential.update({
          attesterPubKey: attester.publicKey,
          accumulators: [
            accumulators[2],
            accumulators[1],
            accumulator,
            accumulators[0],
          ],
        })
      ).resolves.toEqual(expect.anything())
      await expect(
        credential.update({
          attesterPubKey: attester.publicKey,
          accumulators: [
            accumulators[1],
            accumulators[2],
            accumulators[0],
            accumulator,
          ],
        })
      ).resolves.toEqual(expect.anything())
    })
  })
  // run tests on invalid data
  describe('Negative tests', () => {
    it('Should throw for invalid credential', async () => {
      let success = false
      try {
        new Credential('dummyCredential').getUpdateCounter()
        success = true
      } catch (e) {
        expect(e.message).toEqual('Invalid credential')
      }
      try {
        new Credential(
          JSON.stringify({ updateCounter: 'NaN' })
        ).getUpdateCounter()
        success = true
      } catch (e) {
        expect(e.message).toEqual('Invalid credential')
      }
      try {
        new Credential(
          JSON.stringify({ notUpdateCounter: 'NaN' })
        ).getUpdateCounter()
        success = true
      } catch (e) {
        expect(e.message).toEqual('Invalid credential')
      }
      expect(success).toBe(false)
    })
    it('Should throw in updateCredential with pubkey from different attester', async () => {
      await expect(
        credential.update({
          attesterPubKey: attester2.publicKey, // should be attester to be valid
          accumulators: [accumulator],
        })
      ).rejects.toThrow('ecdsa signature was invalid')
    })
    it('Should throw in updateCredential with different accumulator of same attester', async () => {
      const acc = await attester.createAccumulator()
      await expect(
        credential.update({
          attesterPubKey: attester2.publicKey, // should be attester to be valid
          accumulators: [acc],
        })
      ).rejects.toThrow('ecdsa signature was invalid')
    })
    it('Should throw in updateCredential with accumulator from different attester', async () => {
      await expect(
        credential.update({
          attesterPubKey: attester.publicKey,
          accumulators: [accumulator2], // should be attester to be valid
        })
      ).rejects.toThrow('ecdsa signature was invalid')
    })
    it('Should throw in updateCredential with accumulator + pubkey from different attester', async () => {
      await expect(
        credential.update({
          attesterPubKey: attester2.publicKey, // should be attester to be valid
          accumulators: [accumulator2], // should be attester to be valid
        })
      ).rejects.toThrow('ecdsa signature was invalid')
    })
  })
})
