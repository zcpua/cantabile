// Small helpers around the sale_state_transitions log. Each scraper drives
// its own upsert (each has slightly different on-conflict semantics), so
// this module only handles the state read + transition insert.

/**
 * Read the current sale_state for a performance keyed by source_id. Returns
 * null if the row does not yet exist. Callers use the return value together
 * with the incoming state to decide whether to write a transition.
 */
export async function readCurrentSaleState(sql, sourceId) {
  if (!sourceId) return null;
  const rows = await sql`
    SELECT sale_state FROM public.performances WHERE source_id = ${sourceId} LIMIT 1
  `;
  return rows.length ? rows[0].sale_state ?? null : null;
}

/**
 * Append a row to sale_state_transitions if — and only if — this observation
 * represents a real state change on an already-known performance. Suppresses
 * the transition on:
 *
 *   - The first scrape of a performance (prevState === null). Otherwise every
 *     freshly-imported on_sale row would emit a phantom transition, and the
 *     notifier would treat it as "tickets just opened" even though no user
 *     could have consented yet.
 *   - A same-state re-scrape (prevState === nextState).
 *
 * Idempotent under scraper retries because the unique index
 * (performance_id, from_state, to_state, detected_at) rejects a duplicate
 * inside the same second.
 */
export async function logSaleStateTransition(sql, performanceId, prevState, nextState) {
  if (prevState === null || prevState === undefined) return;
  if (prevState === nextState) return;
  await sql`
    INSERT INTO public.sale_state_transitions (performance_id, from_state, to_state)
    VALUES (${performanceId}, ${prevState}, ${nextState})
    ON CONFLICT DO NOTHING
  `;
}

/**
 * Convenience: wrap a scraper's save function with prev-state read + transition
 * write, given a way to locate the row after the upsert (so we get the assigned
 * performance id even on first insert).
 *
 * Not currently used; each scraper inlines the two calls directly to stay
 * closer to its existing structure. Kept exported for future scrapers.
 */
export async function withTransitionLog(sql, { sourceId, nextState, upsert, findId }) {
  const prevState = await readCurrentSaleState(sql, sourceId);
  await upsert();
  const performanceId = await findId();
  if (performanceId) await logSaleStateTransition(sql, performanceId, prevState, nextState);
  return { prevState, nextState };
}
