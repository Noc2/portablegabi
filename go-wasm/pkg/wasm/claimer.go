// +build wasm

package wasm

import (
	"encoding/json"
	"errors"
	"syscall/js"

	"github.com/KILTprotocol/portablegabi/go-wasm/pkg/credentials"
	"github.com/privacybydesign/gabi"
	"github.com/privacybydesign/gabi/revocation"
)

// GenKey creates the private key for the claimer
func GenKey(this js.Value, inputs []js.Value) (interface{}, error) {
	claimer, err := credentials.NewClaimer(SysParams)
	if err != nil {
		return nil, err
	}
	return claimer, nil
}

// KeyFromMnemonic derives a key from a given mnemonic
func KeyFromMnemonic(this js.Value, inputs []js.Value) (interface{}, error) {
	if len(inputs) < 1 {
		return nil, errors.New("Missing mnemonic to generate claimer keys")
	}
	if len(inputs) < 2 {
		return nil, errors.New("Missing password to generate claimer keys")
	}
	claimer, err := credentials.ClaimerFromMnemonic(SysParams, inputs[0].String(), inputs[1].String())
	if err != nil {
		return nil, err
	}
	return claimer, nil
}

// RequestAttestation creates a session object and a message which request the
// attestation of specific attributes. The second object should be sent to an
// attester. This method expects as inputs the private key of the claimer, a
// json encoded string containing the claim which should be attested, the
// handshake message from the attester and the public key of the attester.
func RequestAttestation(this js.Value, inputs []js.Value) (interface{}, error) {
	if len(inputs) < 4 {
		return nil, errors.New("Missing inputs to request attestation")
	}
	claimer := &credentials.Claimer{}
	claim := credentials.Claim{}
	handshakeMsg := &credentials.StartSessionMsg{}
	issuerPubKey := &gabi.PublicKey{}

	if err := json.Unmarshal([]byte(inputs[0].String()), claimer); err != nil {
		return nil, err
	}
	if err := json.Unmarshal([]byte(inputs[1].String()), &claim); err != nil {
		return nil, err
	}
	if err := json.Unmarshal([]byte(inputs[2].String()), handshakeMsg); err != nil {
		return nil, err
	}
	if err := json.Unmarshal([]byte(inputs[3].String()), issuerPubKey); err != nil {
		return nil, err
	}

	session, msg, err := claimer.RequestAttestationForClaim(issuerPubKey, handshakeMsg, claim)
	if err != nil {
		return nil, err
	}
	return map[string]interface{}{
		"session": session,
		"message": msg,
	}, nil
}

// BuildCredential creates a credential which can be used to create proofs that
// the claimer posseses certain attributes. This method expects as input the
// private key of the claimer, the session object created by requestAttestation
// and the signature message send the attester.
func BuildCredential(this js.Value, inputs []js.Value) (interface{}, error) {
	if len(inputs) < 3 {
		return nil, errors.New("Missing inputs to build credential")
	}
	claimer := &credentials.Claimer{}
	session := &credentials.UserIssuanceSession{}
	signature := &gabi.IssueSignatureMessage{}

	if err := json.Unmarshal([]byte(inputs[0].String()), claimer); err != nil {
		return nil, err
	}
	if err := json.Unmarshal([]byte(inputs[1].String()), session); err != nil {
		return nil, err
	}
	if err := json.Unmarshal([]byte(inputs[2].String()), signature); err != nil {
		return nil, err
	}

	credential, err := claimer.BuildCredential(signature, session)
	if err != nil {
		return nil, err
	}
	return credential, nil
}

// BuildPresentation creates a proof that the claimer posseses the requested
// attributes. This method takes as input the private key of the claimer, the
// credential which contains the requested attributes, a json encoded list
// containing the requested attributes and the public key of the attester.
// It returns a proof containing the values of the requested attributes.
func BuildPresentation(this js.Value, inputs []js.Value) (interface{}, error) {
	if len(inputs) < 4 {
		return nil, errors.New("Missing inputs to build presentation")
	}
	claimer := &credentials.Claimer{}
	credential := &credentials.AttestedClaim{}
	request := &credentials.PresentationRequest{}
	issuerPubKey := &gabi.PublicKey{}

	if err := json.Unmarshal([]byte(inputs[0].String()), claimer); err != nil {
		return nil, err
	}
	if err := json.Unmarshal([]byte(inputs[1].String()), credential); err != nil {
		return nil, err
	}
	if err := json.Unmarshal([]byte(inputs[2].String()), request); err != nil {
		return nil, err
	}
	if err := json.Unmarshal([]byte(inputs[3].String()), issuerPubKey); err != nil {
		return nil, err
	}

	disclosedAttr, err := claimer.BuildPresentation(issuerPubKey, credential, request)
	if err != nil {
		return nil, err
	}
	return disclosedAttr, nil
}

func BuildCombinedPresentation(this js.Value, inputs []js.Value) (interface{}, error) {
	if len(inputs) < 4 {
		return nil, errors.New("Missing inputs to build combined presentation")
	}
	claimer := &credentials.Claimer{}
	creds := []*credentials.AttestedClaim{}
	request := &credentials.CombinedPresentationRequest{}
	attesterPubKey := []*gabi.PublicKey{}

	if err := json.Unmarshal([]byte(inputs[0].String()), claimer); err != nil {
		return nil, err
	}
	if err := json.Unmarshal([]byte(inputs[1].String()), &creds); err != nil {
		return nil, err
	}
	if err := json.Unmarshal([]byte(inputs[2].String()), request); err != nil {
		return nil, err
	}
	if err := json.Unmarshal([]byte(inputs[3].String()), &attesterPubKey); err != nil {
		return nil, err
	}

	disclosedAttr, err := claimer.BuildCombinedPresentation(attesterPubKey, creds, request)
	if err != nil {
		return nil, err
	}
	return disclosedAttr, nil
}

// UpdateCredential updates the non revocation witness using the provided update.
func UpdateCredential(this js.Value, inputs []js.Value) (interface{}, error) {
	if len(inputs) < 3 {
		return nil, errors.New("Missing inputs to update credential")
	}
	credential := &credentials.AttestedClaim{}
	update := &revocation.Update{}
	issuerPubKey := &gabi.PublicKey{}

	if err := json.Unmarshal([]byte(inputs[0].String()), credential); err != nil {
		return nil, err
	}
	if err := json.Unmarshal([]byte(inputs[1].String()), update); err != nil {
		return nil, err
	}
	if err := json.Unmarshal([]byte(inputs[2].String()), issuerPubKey); err != nil {
		return nil, err
	}

	if err := credential.Update(issuerPubKey, update); err != nil {
		return nil, err
	}
	return credential, nil
}

// UpdateAllCredential updates the non revocation witness using all the provided updates.
func UpdateAllCredential(this js.Value, inputs []js.Value) (interface{}, error) {
	if len(inputs) < 3 {
		return nil, errors.New("Missing inputs to update credential")
	}
	credential := &credentials.AttestedClaim{}
	updates := []*revocation.Update{}
	issuerPubKey := &gabi.PublicKey{}

	if err := json.Unmarshal([]byte(inputs[0].String()), credential); err != nil {
		return nil, err
	}
	if err := json.Unmarshal([]byte(inputs[1].String()), &updates); err != nil {
		return nil, err
	}
	if err := json.Unmarshal([]byte(inputs[2].String()), issuerPubKey); err != nil {
		return nil, err
	}

	if err := credential.UpdateAll(issuerPubKey, updates); err != nil {
		return nil, err
	}
	return credential, nil
}
