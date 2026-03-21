const fired = new Set<number>();

export function markFired(id: number) {
  fired.add(id);
}

export function hasFired(id: number) {
  return fired.has(id);
}
