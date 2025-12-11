// src/env.d.ts
export {};

declare global {
  interface ImportMetaEnv {
    readonly VITE_GEMINI_API_KEY: string;
    readonly VITE_GEMINI_API_ENDPOINT?: string;
    // add other VITE_... keys you use
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}
