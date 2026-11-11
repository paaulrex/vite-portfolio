const WORD = /[a-z0-9']+|[!?]/g;
const TERM = /[\p{L}\p{N}_]{2,}/gu;

export const tokenize = (text: string) => text.toLowerCase().match(WORD) ?? [];

export function encode(
  text: string,
  vocab: Map<string, number>,
  maxLen: number,
  unkId: number,
): number[] {
  return tokenize(text)
    .slice(0, maxLen)
    .map((t) => vocab.get(t) ?? unkId);
}

export function nbTerms(text: string): string[] {
  const plain = text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{Mn}/gu, '');
  const words = plain.match(TERM) ?? [];
  return [...words, ...words.slice(1).map((w, i) => `${words[i]} ${w}`)];
}
