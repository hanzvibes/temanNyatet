// Vercel entrypoint for the pre-bundled API.
// Keeping this wrapper as JavaScript prevents Vercel's Node builder from
// running its own TypeScript declaration emit over the workspace sources.
export { default } from "../dist/index.mjs";