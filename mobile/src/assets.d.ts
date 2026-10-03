// A font file imported by a module is the number Metro gives the asset.
declare module '*.otf' {
  const source: number;
  export default source;
}
