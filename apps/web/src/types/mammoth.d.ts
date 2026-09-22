// mammoth ships no types and there's no @types/mammoth; this covers only
// the one function this codebase actually calls.
declare module "mammoth" {
  export function extractRawText(input: { buffer: Buffer }): Promise<{ value: string; messages: unknown[] }>;
}
