interface RecurrenceDecision {
  finalizingOccurrence: boolean;
  recurring: boolean;
  resolved: boolean;
  successorExists: boolean;
}

export function shouldCreateRecurringSuccessor({
  finalizingOccurrence,
  recurring,
  resolved,
  successorExists,
}: RecurrenceDecision): boolean {
  return finalizingOccurrence && recurring && resolved && !successorExists;
}
