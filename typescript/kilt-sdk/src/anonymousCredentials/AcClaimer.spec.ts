import AcClaimer from './AcClaimer'

const mnemonics = [
  'scissors purse again yellow cabbage fat alpha come snack ripple jacket broken',
  'opera initial unknown sign minimum sadness crane worth attract ginger category discover',
]

describe('AC Claimer', () => {
  it('should create known identities', async () => {
    const claimer1 = await AcClaimer.buildFromMnemonic(mnemonics[0])
    const claimer2 = await AcClaimer.buildFromMnemonic(mnemonics[1])
    expect(claimer1).toHaveProperty(
      'secret',
      '{"MasterSecret":"s4FJkls3UufDpffhGmw9gLuhvMfyd2hLcJKOEJgHzR8="}'
    )
    expect(claimer2).toHaveProperty(
      'secret',
      '{"MasterSecret":"77LePLnF1jpQGZkXVifDrHckKbHFBFm3l1Hq2tAm8dY="}'
    )
  })

  it('should fail creating identity based on invalid phrases', async () => {
    const phraseWithUnknownWord =
      'taxi toddler rally tonight certain tired program settle topple what execute stew' // stew instead of few
    const phraseWithInsufficientLength = 'taxi toddler rally tonight'
    await expect(
      AcClaimer.buildFromMnemonic(phraseWithUnknownWord)
    ).rejects.toThrow('Invalid phrase')
    await expect(
      AcClaimer.buildFromMnemonic(phraseWithInsufficientLength)
    ).rejects.toThrow('too long or malformed')
  })
})
