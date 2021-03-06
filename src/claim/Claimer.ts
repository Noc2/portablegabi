import IClaimer, {
  AttestationRequest,
  ClaimerAttestationSession,
  Presentation,
  CombinedPresentation,
  ClaimError,
} from '../types/Claim'
import WasmHooks from '../wasm/WasmHooks'
import {
  IGabiMsgSession,
  InitiateAttestationRequest,
  Attestation,
  AttesterPublicKey,
} from '../types/Attestation'
import {
  CombinedPresentationRequest,
  PresentationRequest,
} from '../types/Verification'
import goWasmExec from '../wasm/wasm_exec_wrapper'
import Credential from './Credential'

/**
 * Checks that the provided claim is a valid object.
 *
 * @param claim The object which should be a valid claim.
 * @throws {ClaimError.claimMissing} If the claim is missing inside the [[AttestationRequest]].
 * @throws {ClaimError.notAnObject} If the [[Attestation]] object includes a non-object type claim.
 * @throws {ClaimError.duringParsing} If an error occurs during JSON deserialization.
 */
function checkValidClaimStructure(claim: object): void | Error {
  if (!Object.keys(claim).length) {
    throw ClaimError.claimMissing
  }
  if (typeof claim !== 'object') {
    throw ClaimError.notAnObject(typeof claim)
  }
  if (Array.isArray(claim)) {
    throw ClaimError.duringParsing
  }
}

export default class Claimer implements IClaimer {
  private readonly secret: string

  /**
   * Generates a claimer using the provided mnemonic.
   *
   * @param mnemonic The mnemonic which is used to generate the key.
   * @param password The password which is used to generate the key.
   * @returns A new claimer.
   */
  public static async buildFromMnemonic(
    mnemonic: string,
    password = ''
  ): Promise<Claimer> {
    // secret's structure unmarshalled is { MasterSecret: string }
    const secret = await goWasmExec<string>(WasmHooks.keyFromMnemonic, [
      mnemonic,
      password,
    ])
    return new this(secret)
  }

  /**
   * Generates a new master secret and returns a new [[Claimer]] object.
   *
   * @returns A new [[Claimer]].
   */
  public static async create(): Promise<Claimer> {
    const secret = await goWasmExec<string>(WasmHooks.genKey)
    return new this(secret)
  }

  /**
   * Constructs a new [[Claimer]] using the given master secret.
   *
   * @param secret The master secret of the [[Claimer]].
   */
  constructor(secret: string) {
    this.secret = secret
  }

  /**
   * Creates an [[AttestationRequest]] using the provided [[InitiateAttestationRequest]].
   *
   * @param p The parameter object.
   * @param p.claim The claim which should get attested.
   * @param p.startAttestationMsg The [[InitiateAttestationRequest]] provided by the attester.
   * @param p.attesterPubKey The [[PublicKey]] of the attester.
   * @returns An [[AttestationRequest]] and a [[ClaimerAttestationSession]] which together with an [[AttestationResponse]] can be used to create a [[Credential]].
   */
  public async requestAttestation({
    claim,
    startAttestationMsg,
    attesterPubKey,
  }: {
    claim: object
    startAttestationMsg: InitiateAttestationRequest
    attesterPubKey: AttesterPublicKey
  }): Promise<{
    message: AttestationRequest
    session: ClaimerAttestationSession
  }> {
    // check for invalid claim structure
    checkValidClaimStructure(claim)
    const { message, session } = await goWasmExec<IGabiMsgSession>(
      WasmHooks.requestAttestation,
      [
        this.secret,
        JSON.stringify(claim),
        startAttestationMsg.valueOf(),
        attesterPubKey.valueOf(),
      ]
    )
    return {
      message: new AttestationRequest(message),
      session: new ClaimerAttestationSession(session),
    }
  }

  /**
   * Builds a [[Credential]] using the [[ClaimerAttestationSession]] and the [[Attestation]].
   *
   * @param p The parameter object.
   * @param p.claimerSession The session object corresponding to the [[AttestationRequest]].
   * @param p.attestation The [[Attestation]] provided by the [[Attester]].
   * @returns A signed and valid [[Credential]].
   */
  public async buildCredential({
    claimerSession,
    attestation,
  }: {
    claimerSession: ClaimerAttestationSession
    attestation: Attestation
  }): Promise<Credential> {
    return new Credential(
      await goWasmExec<string>(WasmHooks.buildCredential, [
        this.secret,
        claimerSession.valueOf(),
        attestation.valueOf(),
      ])
    )
  }

  /**
   * Uses the [[PresentationRequest]] and a [[Credential]] to build an anonymous presentation.
   *
   * @param p The parameter object.
   * @param p.credential The [[Credential]] which contains all the requested attributes.
   * @param p.presentationReq The [[PresentationRequest]] received from the [[Verifier]].
   * @param p.attesterPubKey The public key of the [[Attester]] who signed the [[Credential]].
   * @returns A [[Presentation]] that can be used to disclose attributes with a [[Verifier]].
   *    Must only be used once!
   */
  public async buildPresentation({
    credential,
    presentationReq,
    attesterPubKey,
  }: {
    credential: Credential
    presentationReq: PresentationRequest
    attesterPubKey: AttesterPublicKey
  }): Promise<Presentation> {
    return new Presentation(
      await goWasmExec<string>(WasmHooks.buildPresentation, [
        this.secret,
        credential.valueOf(),
        presentationReq.valueOf(),
        attesterPubKey.valueOf(),
      ])
    )
  }

  /**
   * Uses the [[PresentationRequest]] and a [[Credential]] to build an anonymous presentation.
   *
   * @param p The parameter object.
   * @param p.credentials An array of [[Credential]]s which is used to provide the requested attributes.
   * @param p.combinedPresentationReq The array of [[PresentationRequest]]s received from the [[Verifier]].
   * @param p.attesterPubKeys An array of [[PublicKey]]s which corresponds to the array of [[Credential]]s.
   * @returns A [[CombinedPresentation]] that can be used to disclose attributes with a [[Verifier]].
   *    Must only be used once!
   */
  public async buildCombinedPresentation({
    credentials,
    combinedPresentationReq,
    attesterPubKeys,
  }: {
    credentials: Credential[]
    combinedPresentationReq: CombinedPresentationRequest
    attesterPubKeys: AttesterPublicKey[]
  }): Promise<CombinedPresentation> {
    // make a json array out of already json serialised values
    // we don't want a json array of strings
    return new CombinedPresentation(
      await goWasmExec<string>(WasmHooks.buildCombinedPresentation, [
        this.secret,
        `[${credentials.join(',')}]`,
        combinedPresentationReq.valueOf(),
        `[${attesterPubKeys.join(',')}]`,
      ])
    )
  }
}
