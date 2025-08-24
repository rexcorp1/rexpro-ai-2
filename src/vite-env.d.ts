// This file is used for TypeScript type declarations.

declare var process: {
  env: {
    API_KEY: string;
  }
}

declare module '*.svg' {
  const content: string;
  export default content;
}
