/**
 * The wire shape of an early-access receipt, as `/api/early-access` (and the
 * waitlist webhook behind it) returns it. Field names mirror the wire exactly
 * (`snake_case`); `EarlyAccessMapper.toDomain` is the only place that reads it
 * (`RC-29`, `RC-30`). `platform` is a bare string here because the wire is
 * untrusted — the Mapper narrows it.
 */
export interface EarlyAccessResponse {
  readonly id: string
  readonly email: string
  readonly platform: string
  readonly position: number | null
  readonly joined_at: string
}

/**
 * The JSON body the browser posts and the sink forwards — the request in wire
 * form, produced only by `EarlyAccessMapper.fromDomain`.
 */
export interface EarlyAccessRequestBody {
  readonly email: string
  readonly platform: string
  readonly source: string | null
  readonly locale: string | null
}
