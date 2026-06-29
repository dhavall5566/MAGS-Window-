let bootstrapComplete = false;
const listeners = new Set<() => void>();

export function markBootstrapComplete(): void {
  if (bootstrapComplete) return;
  bootstrapComplete = true;
  listeners.forEach((listener) => listener());
  listeners.clear();
}

export function isBootstrapComplete(): boolean {
  return bootstrapComplete;
}

export function onBootstrapComplete(listener: () => void): () => void {
  if (bootstrapComplete) {
    listener();
    return () => {};
  }
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function resetBootstrapStateForTests(): void {
  bootstrapComplete = false;
  listeners.clear();
}
