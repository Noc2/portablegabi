export interface IAcContextNonce {
  context: string
  nonce: string
}

export interface IAcMsgSession {
  message: string
  session: string
}
export interface IAcAttestationStart {
  message: IAcContextNonce
  session: any
}

export interface IAcAttestationRequest {
  message: any
  session: {
    claim: {
      cType: string
      contents: any
    }
    [crypto: string]: any
  }
}

export interface IAcAttrMsg extends IAcContextNonce {
  disclosedAttributes: string[]
}

export interface IAcVerifiedAtts {
  verified: 'true' | 'false'
  claim: string
}

export interface IAcClaimer {
  requestAttestation: Function
  buildCredential: Function
  revealAttributes: Function
}

export interface IAcAttester {
  startAttestation: Function
  issueAttestation: Function
  revokeAttestation: Function
  getPubKey: Function
}
