/**
 * Commit message policy for kro-pwa.
 *
 * Conventional Commits, a subject that fits a terminal, and no machine
 * attribution trailers: bankai canon forbids an agent signing the human's work
 * as a co-author, so the trailer never reaches the history in the first place.
 *
 * Run manually: `pnpm exec commitlint --from origin/main --to HEAD`.
 */

/**
 * Matches `Co-authored-by:` / `Signed-off-by:` / `Generated-by:` style trailers
 * that credit a model or a coding agent. A human co-author is untouched.
 */
const LLM_ATTRIBUTION =
  /^\s*(co-authored-by|signed-off-by|assisted-by|generated-(?:by|with)|reviewed-by)\s*:.*\b(claude|anthropic|chatgpt|openai|gpt-\d|copilot|gemini|cursor|codex|devin|llm|\bai\b)\b/im

/** Matches the "Generated with <tool>" footers agents like to append. */
const LLM_FOOTER =
  /(generated with|co-?authored (?:by|with)|created (?:by|with))\s+\[?\s*(claude|chatgpt|copilot|gemini|cursor|codex)/i

module.exports = {
  extends: ['@commitlint/config-conventional'],
  plugins: [
    {
      rules: {
        'no-llm-attribution': ({ raw }) => {
          const message = raw ?? ''
          const offends =
            LLM_ATTRIBUTION.test(message) || LLM_FOOTER.test(message)
          return [
            !offends,
            'commit messages must not credit an LLM or coding agent (no co-author or "generated with" trailers)',
          ]
        },
      },
    },
  ],
  rules: {
    // The subject has to survive `git log --oneline` in a narrow terminal.
    'header-max-length': [2, 'always', 72],
    'no-llm-attribution': [2, 'always'],
  },
}
