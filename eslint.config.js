import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import pluginVue from 'eslint-plugin-vue'

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
      // Heading sizes come from the h1-h6 scale in main.css, so a per-heading text-* class
      // silently forks it. Only a bare size is caught: a responsive bump (md:text-5xl) is
      // something the level default cannot express, and a genuine one-off can still
      // eslint-disable with a reason, which is what makes the exception reviewable.
      'vue/no-restricted-static-attribute': [
        'error',
        {
          key: 'class',
          value: '/(^|\\s)text-(xs|sm|base|lg|[2-9]?xl)(\\s|$)/',
          element: '/^h[1-6]$/',
          message: 'Heading sizes come from the h1-h6 scale in src/assets/main.css — drop the text-* class or use the right level.',
        },
      ],
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
