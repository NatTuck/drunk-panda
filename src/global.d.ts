export {};

declare global {
  interface Window {
    __panda?: Record<string, unknown>;
  }
}
