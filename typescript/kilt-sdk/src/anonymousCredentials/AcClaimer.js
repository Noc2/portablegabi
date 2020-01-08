"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const wasm_exec_wrapper_1 = tslib_1.__importDefault(require("./wasm_exec_wrapper"));
const Enums_1 = tslib_1.__importDefault(require("./Enums"));
const Identity_1 = tslib_1.__importDefault(require("../identity/Identity"));
const crypto_1 = tslib_1.__importDefault(require("../crypto"));
class AcClaimer extends Identity_1.default {
    constructor(address, boxPublicKeyAsHex, seed, secret) {
        super(address, boxPublicKeyAsHex);
        this.boxKeyPair = Identity_1.default.createBoxKeyPair(seed);
        this.secret = secret;
    }
    // public readonly address: IPublicIdentity['address']
    // TODO: Add checks for invalid mnemonic
    static async buildFromMnemonic(mnemonic) {
        // secret's structure unmarshalled is { MasterSecret: string }
        const secret = await AcClaimer.genSecret(mnemonic);
        const { address, seedAsHex, seed } = Identity_1.default.buildFromMnemonic(mnemonic);
        return new AcClaimer(address, seedAsHex, seed, secret);
    }
    // TODO: Find better name
    static async buildFromScratch() {
        const { address, seedAsHex, seed } = Identity_1.default.buildFromMnemonic();
        const x = Identity_1.default.buildFromMnemonic();
        x.encryptAsymmetric('test', seedAsHex);
        const secret = await wasm_exec_wrapper_1.default(Enums_1.default.genKey);
        return new AcClaimer(address, seedAsHex, seed, secret);
    }
    static async genSecret(mnemonic) {
        return wasm_exec_wrapper_1.default(Enums_1.default.keyFromMnemonic, [mnemonic]);
    }
    encryptAsymmetricAsStr(cryptoInput, boxPublicKey) {
        return crypto_1.default.encryptAsymmetricAsStr(cryptoInput, boxPublicKey, this.boxKeyPair.secretKey);
    }
    // request attestation
    async requestAttestation({ claim, startAttestationMsg, attesterPubKey, }) {
        const { session, message } = await wasm_exec_wrapper_1.default(Enums_1.default.requestAttestation, [
            this.secret,
            JSON.stringify(claim),
            JSON.stringify(startAttestationMsg),
            attesterPubKey,
        ]);
        return {
            message: JSON.parse(message),
            session: JSON.parse(session),
        };
    }
    // build credential
    async buildCredential({ claimerSignSession, signature, }) {
        const response = await wasm_exec_wrapper_1.default(Enums_1.default.buildCredential, [
            this.secret,
            JSON.stringify(claimerSignSession),
            signature,
        ]);
        return response;
    }
    // reveal attributes
    async revealAttributes({ credential, reqRevealedAttrMsg, attesterPubKey, }) {
        const response = await wasm_exec_wrapper_1.default(Enums_1.default.revealAttributes, [
            this.secret,
            credential,
            JSON.stringify(reqRevealedAttrMsg),
            attesterPubKey,
        ]);
        return response;
    }
}
exports.default = AcClaimer;
//# sourceMappingURL=AcClaimer.js.map