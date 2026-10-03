/// <reference types="vite/client" />

/** Vite's `?url` imports resolve to the emitted asset path. */
declare module "*?url" {
  const src: string;
  export default src;
}
