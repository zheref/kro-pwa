/**
 * Endeavor Activity's Producer (`RC-3`, `RC-6`, `RC-7`, `RC-25`): reads the
 * endeavor with its performances through `extra.localStore`, never throws,
 * always resolves a `Result`.
 */
import { type Result, err, ok } from '@kro/core'
import { createAsyncThunk } from '@reduxjs/toolkit'
import { readStoredEndeavor } from '../../library/persistence/storedEndeavors'
import type { ThunkExtra } from '../../library/store'
import {
  type EndeavorActivityException,
  EndeavorActivityExceptions,
} from './EndeavorActivityException'
import {
  type ActivityEndeavor,
  type ActivityRow,
  activityRowsFor,
} from './EndeavorActivityRows'

export interface EndeavorActivitySnapshot {
  readonly endeavor: ActivityEndeavor
  readonly rows: readonly ActivityRow[]
}

const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

export const loadEndeavorActivityThunk = createAsyncThunk<
  Result<EndeavorActivitySnapshot, EndeavorActivityException>,
  { endeavorId: string },
  { extra: ThunkExtra }
>(
  'endeavorActivity/onActivityLoadCompleted',
  async ({ endeavorId }, { extra }) => {
    try {
      const endeavor = await readStoredEndeavor(extra.localStore, endeavorId)
      if (!endeavor) {
        return err(EndeavorActivityExceptions.endeavorNotFound(endeavorId))
      }
      return ok({
        endeavor: {
          id: endeavor.id,
          title: endeavor.title,
          kind: endeavor.kind,
        },
        rows: activityRowsFor(endeavor),
      })
    } catch (error) {
      return err(EndeavorActivityExceptions.loadFailed(messageOf(error)))
    }
  },
)
