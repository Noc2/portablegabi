import PublicIdentity from '../identity/PublicIdentity'
import goWasmExec from './wasm_exec_wrapper'
import GoHooks from './Enums'
import {
  IAcAttrMsg,
  IAcMsgSession,
  IAcVerifiedAtts,
  IAcContextNonce,
} from './Types'

// TODO: Remove extends PublicIdentity?
export default class AcVerifier extends PublicIdentity {
  public static async verifyAttributes({
    proof,
    verifierSession,
    attesterPubKey,
  }: {
    proof: string
    verifierSession: IAcContextNonce
    attesterPubKey: string
  }): Promise<IAcVerifiedAtts> {
    const reponse = await goWasmExec<IAcVerifiedAtts>(
      GoHooks.verifyAttributes,
      [proof, JSON.stringify(verifierSession), attesterPubKey]
    )
    return reponse
  }

  // start verification
  public static async startVerificationSession({
    disclosedAttributes,
  }: {
    disclosedAttributes: string[]
  }): Promise<{
    message: IAcAttrMsg
    session: IAcContextNonce
  }> {
    const { message, session } = await goWasmExec<IAcMsgSession>(
      GoHooks.startVerificationSession,
      disclosedAttributes
    )
    return { message: JSON.parse(message), session: JSON.parse(session) }
  }
}
