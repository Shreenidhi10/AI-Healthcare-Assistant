export interface DiffToken {
  text: string;
  changed: boolean;
}

/** Splits text into words while preserving the whitespace between them as tokens. */
function tokenize(text: string): string[] {
  return text.split(/(\s+)/).filter((t) => t.length > 0);
}

/**
 * Word-level diff based on the longest common subsequence.
 * Returns tokens for the "result" text, flagging tokens that are new/changed
 * relative to the "original" text so the UI can highlight them.
 */
export function diffWords(original: string, result: string): DiffToken[] {
  const a = tokenize(original);
  const b = tokenize(result);

  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));

  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] =
        a[i].trim() === b[j].trim() && a[i].trim() !== ""
          ? dp[i + 1][j + 1] + 1
          : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const tokens: DiffToken[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i].trim() === b[j].trim()) {
      tokens.push({ text: b[j], changed: false });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      i++;
    } else {
      tokens.push({ text: b[j], changed: true });
      j++;
    }
  }
  while (j < m) {
    tokens.push({ text: b[j], changed: true });
    j++;
  }

  return tokens;
}
