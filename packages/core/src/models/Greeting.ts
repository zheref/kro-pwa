/**
 * SCAFFOLDING — demo domain model for the UZF reference loop.
 *
 * `Greeting` exists only so the state tier landed by #5 has a real domain type to
 * carry end to end (Service → Mapper → Producer → Reducer → Selector → hook).
 * Feature children (#7+) replace it with the actual Kro domain; nothing outside
 * the `greeting` demo feature may depend on it.
 *
 * Domain model rules it demonstrates: `readonly` throughout, real domain types
 * (`Date`, not a wire string), no serialization annotations, no UI concern.
 */
export interface Greeting {
  readonly id: string
  readonly recipient: string
  readonly message: string
  /** Optional flourish — present on some greetings, absent on others. */
  readonly signature: string | null
  readonly issuedAt: Date
}
