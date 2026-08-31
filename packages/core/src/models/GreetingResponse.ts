/**
 * SCAFFOLDING — the wire shape of a greeting, as a Service returns it.
 *
 * Wire types never leak past the Producer boundary: `GreetingMapper.toDomain`
 * translates this into the `Greeting` domain model, and slice state only ever
 * holds the domain side (`UZF-8`, `UZF-17`, `RC-30`).
 */
export interface GreetingResponse {
  readonly id: string
  readonly recipient: string
  readonly message: string
  readonly signature?: string | null
  readonly issued_at: string
}
