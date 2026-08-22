import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import pluginVue from 'eslint-plugin-vue'
import commentCap from './tools/eslint-comment-cap.js'

export default tseslint.config(
  // .claude holds git worktrees of this same repo. Linting into one gives every file a
  // second candidate tsconfig root and fails the whole run.
  { ignores: ['dist/**', 'node_modules/**', 'coverage/**', '.claude/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    languageOptions: { parserOptions: { parser: tseslint.parser } },
  },
  {
    languageOptions: { globals: { ...globals.browser } },
    plugins: { 'comment-cap': commentCap },
    rules: {
      // Single-word component names are the convention here (BaseCard, Rosters); the
      // filename already carries the namespace via its directory.
      'vue/multi-word-component-names': 'off',
      // The template formatting is hand-tuned for readability; prettier owns layout.
      'vue/max-attributes-per-line': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      'vue/html-self-closing': 'off',
      'vue/html-indent': 'off',
      'vue/html-closing-bracket-newline': 'off',
      'vue/attributes-order': 'off',
      'vue/first-attribute-linebreak': 'off',
      'vue/multiline-html-element-content-newline': 'off',
      // Bare sizes only: a responsive bump is something the level default cannot express,
      // and a one-off can eslint-disable, which is what makes the exception reviewable.
      'vue/no-restricted-static-attribute': [
        'error',
        {
          key: 'class',
          value: '/(^|\\s)text-(xs|sm|base|lg|[2-9]?xl)(\\s|$)/',
          element: '/^h[1-6]$/',
          message: 'Heading sizes come from the h1-h6 scale in src/assets/main.css — drop the text-* class or use the right level.',
        },
      ],
      // Guidance about comment length never held on its own. This is the heading-scale
      // bargain: longer is allowed, but only by saying so where a reviewer sees it.
      'comment-cap/max-lines': 'error',
      // TypeScript already resolves identifiers, and no-undef does not know DOM lib types.
      'no-undef': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['tests/**'],
    languageOptions: { globals: { ...globals.node } },
  },
)
