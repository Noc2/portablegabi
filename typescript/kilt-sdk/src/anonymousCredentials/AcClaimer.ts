import { BoxKeyPair } from 'tweetnacl'
import IClaim from '../types/Claim'
import goWasmExec from './wasm_exec_wrapper'
import GoHooks from './Enums'
import {
  IAcAttestationRequest,
  IAcAttestationStart,
  IAcAttrMsg,
  IAcMsgSession,
  IAcClaimer,
} from './Types'
import Identity, { BoxPublicKey } from '../identity/Identity'
import IPublicIdentity from '../types/PublicIdentity'
import PublicIdentity from '../identity/PublicIdentity'
import Crypto from '../crypto'
import {
  CryptoInput,
  EncryptedAsymmetric,
  EncryptedAsymmetricString,
} from '../crypto/Crypto'

export default class AcClaimer extends Identity implements IAcClaimer {
  private secret: string

  // public readonly address: IPublicIdentity['address']

  // TODO: Add checks for invalid mnemonic
  public static async buildFromMnemonic(mnemonic: string): Promise<AcClaimer> {
    // secret's structure unmarshalled is { MasterSecret: string }
    const secret = await AcClaimer.genSecret(mnemonic)
    const { address, seedAsHex, seed } = Identity.buildFromMnemonic(mnemonic)
    return new AcClaimer(address, seedAsHex, seed, secret)
  }

  // TODO: Find better name
  public static async buildFromScratch(): Promise<AcClaimer> {
    const { address, seedAsHex, seed } = Identity.buildFromMnemonic()
    const x = Identity.buildFromMnemonic()
    x.encryptAsymmetric('test', seedAsHex)
    const secret = await goWasmExec<string>(GoHooks.genKey)
    return new AcClaimer(address, seedAsHex, seed, secret)
  }

  constructor(
    address: IPublicIdentity['address'],
    boxPublicKeyAsHex: IPublicIdentity['boxPublicKeyAsHex'],
    seed: Uint8Array,
    secret: string
  ) {
    super(address, boxPublicKeyAsHex)
    this.boxKeyPair = Identity.createBoxKeyPair(seed)
    this.secret = secret
  }

  private static async genSecret(mnemonic: string): Promise<string> {
    return goWasmExec<string>(GoHooks.keyFromMnemonic, [mnemonic])
  }

  public encryptAsymmetricAsStr(
    cryptoInput: CryptoInput,
    boxPublicKey: BoxPublicKey
  ): Crypto.EncryptedAsymmetricString {
    return Crypto.encryptAsymmetricAsStr(
      cryptoInput,
      boxPublicKey,
      this.boxKeyPair.secretKey
    )
  }

  // request attestation
  public async requestAttestation({
    claim,
    startAttestationMsg,
    attesterPubKey,
  }: {
    claim: IClaim
    startAttestationMsg: IAcAttestationStart['message']
    attesterPubKey: string
  }): Promise<IAcAttestationRequest> {
    const { session, message } = await goWasmExec<IAcMsgSession>(
      GoHooks.requestAttestation,
      [
        this.secret,
        JSON.stringify(claim),
        JSON.stringify(startAttestationMsg),
        attesterPubKey,
      ]
    )
    return {
      message: JSON.parse(message),
      session: JSON.parse(session),
    }
  }

  // build credential
  public async buildCredential({
    claimerSignSession,
    signature,
  }: {
    claimerSignSession: IAcAttestationRequest['session']
    signature: string
  }): Promise<string> {
    const response = await goWasmExec<string>(GoHooks.buildCredential, [
      this.secret,
      JSON.stringify(claimerSignSession),
      signature,
    ])
    return response
  }

  // reveal attributes
  public async revealAttributes({
    credential,
    reqRevealedAttrMsg,
    attesterPubKey,
  }: {
    credential: string
    reqRevealedAttrMsg: IAcAttrMsg
    attesterPubKey: string
  }): Promise<string> {
    const response = await goWasmExec<string>(GoHooks.revealAttributes, [
      this.secret,
      credential,
      JSON.stringify(reqRevealedAttrMsg),
      attesterPubKey,
    ])
    return response
  }
}
