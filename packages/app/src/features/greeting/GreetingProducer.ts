/**
 * SCAFFOLDING — the demo feature's Producer (`RC-3`, `RC-6`, `RC-7`, `RC-25`).
 *
 * Everything a feature child needs to copy is in the twelve lines below:
 *   - the thunk type string is an **event name**, `"<feature>/on<Thing>Completed"`,
 *     never a mechanism like `"greeting/fetchGreeting"` (`RC-2`);
 *   - the Service arrives through `extra`, never a module-level import (`RC-6`);
 *   - `thunkAPI.signal` is passed into the Service so an aborted dispatch exits
 *     silently instead of surfacing as an exception (`RC-3` rule 4);
 *   - the payload creator **never throws** — every failure is caught, translated
 *     by the Mapper, and resolved as `err(...)` (`RC-7`), which is what makes the
 *     slice's `.rejected` arm a defensive fallback rather than the error path.
 */
import { GreetingExceptions, GreetingMapper, err, ok } from '@kro/core'
import type { Greeting, GreetingException, Result } from '@kro/core'
import { createAsyncThunk } from '@reduxjs/toolkit'
import type { ThunkExtra } from '../../library/store'

export const fetchGreetingThunk = createAsyncThunk<
  Result<Greeting, GreetingException>,
  { recipient: string },
  { extra: ThunkExtra }
>('greeting/onGreetingFetchCompleted', async ({ recipient }, { extra, signal }) => {
  try {
    const response = await extra.greetingService.fetchGreeting(recipient, { signal })
    const greeting = GreetingMapper.toDomain(response)
    return greeting
      ? ok(greeting)
      : err(GreetingExceptions.malformed(`greeting for "${recipient}" failed to map`))
  } catch (error) {
    return err(GreetingMapper.toException(error))
  }
})
