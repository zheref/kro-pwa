import { describe, expect, it } from 'vitest'
import {
  LOCAL_DATA_DIALOG_TITLE,
  LocalDataChoice,
  localDataChoices,
  localDataDecisionFor,
  localDataDialogMessage,
  shouldPresentLocalDataDialog,
} from '../LocalDataDialog'

describe('when the dialog appears', () => {
  it('appears when the device holds anonymous rows', () => {
    expect(shouldPresentLocalDataDialog(1)).toBe(true)
    expect(shouldPresentLocalDataDialog(37)).toBe(true)
  })

  it('does not appear when there are none — a first sign-in on a clean device', () => {
    expect(shouldPresentLocalDataDialog(0)).toBe(false)
  })

  it('does not appear for a nonsensical negative count', () => {
    expect(shouldPresentLocalDataDialog(-1)).toBe(false)
  })
})

describe('the copy', () => {
  it("uses canon's title verbatim", () => {
    expect(LOCAL_DATA_DIALOG_TITLE).toBe('You Have Local Data')
  })

  it('interpolates the count, because the count is what makes the choice informed', () => {
    expect(localDataDialogMessage(3)).toBe(
      'You have 3 local endeavors. Associate them with your new account, or start fresh?',
    )
  })

  it('says "endeavor" for one and "endeavors" for many', () => {
    expect(localDataDialogMessage(1)).toContain('1 local endeavor.')
    expect(localDataDialogMessage(2)).toContain('2 local endeavors.')
  })
})

describe('the three choices', () => {
  it('offers exactly the three canon offers, in canon presentation order', () => {
    expect(localDataChoices).toEqual([
      LocalDataChoice.signAll,
      LocalDataChoice.clearAll,
      LocalDataChoice.cancel,
    ])
  })

  it('"Sign All Endeavors to My Account" adopts the rows and keeps them', () => {
    expect(localDataDecisionFor(LocalDataChoice.signAll)).toEqual({
      adoptsAnonymousRows: true,
      clearsLocalRows: false,
      pullsFromCloud: true,
    })
  })

  it('"Clear Everything and Start Over" drops the rows and adopts nothing', () => {
    expect(localDataDecisionFor(LocalDataChoice.clearAll)).toEqual({
      adoptsAnonymousRows: false,
      clearsLocalRows: true,
      pullsFromCloud: true,
    })
  })

  it('"Cancel" keeps the rows and leaves them ANONYMOUS — canon treats dismiss as "keep local data"', () => {
    expect(localDataDecisionFor(LocalDataChoice.cancel)).toEqual({
      adoptsAnonymousRows: false,
      clearsLocalRows: false,
      pullsFromCloud: true,
    })
  })

  it('never both adopts and clears — the two are mutually exclusive by construction', () => {
    for (const choice of localDataChoices) {
      const decision = localDataDecisionFor(choice)
      expect(decision.adoptsAnonymousRows && decision.clearsLocalRows).toBe(
        false,
      )
    }
  })

  it('pulls from the cloud on every arm, exactly as all three canon arms end in loadCoreData', () => {
    for (const choice of localDataChoices) {
      expect(localDataDecisionFor(choice).pullsFromCloud).toBe(true)
    }
  })

  it('makes Cancel and Sign All genuinely different — otherwise the prompt would be theatre', () => {
    expect(localDataDecisionFor(LocalDataChoice.cancel)).not.toEqual(
      localDataDecisionFor(LocalDataChoice.signAll),
    )
  })
})
