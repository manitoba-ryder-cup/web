import { RuleTester } from 'eslint'
import vueParser from 'vue-eslint-parser'
// @ts-expect-error -- a plain-JS eslint plugin, loaded for its rule; no types to import.
import commentCap from '../../tools/eslint-comment-cap.js'

const rule = commentCap.rules['max-lines']
const tester = new RuleTester({ languageOptions: { ecmaVersion: 2022, sourceType: 'module' } })
const vue = new RuleTester({ languageOptions: { parser: vueParser, ecmaVersion: 2022, sourceType: 'module' } })
const tooLong = [{ message: /limit is 2/ }] as never

tester.run('a run of line comments is one block', rule, {
  valid: ['// one\nconst a = 1', '// one\n// two\nconst a = 1', '// one\n\n// two\nconst a = 1'],
  invalid: [{ code: '// one\n// two\n// three\nconst a = 1', errors: tooLong }],
})

// `/**` and `*/` are syntax; counted, a two-line budget leaves a JSDoc none.
tester.run('a block is counted by its prose, not its delimiters', rule, {
  valid: ['/**\n * one\n * two\n */\nconst a = 1'],
  invalid: [{ code: '/**\n * one\n * two\n * three\n */\nconst a = 1', errors: tooLong }],
})

// Three aligned annotations are three comments about three lines, not one block.
tester.run('trailing comments are left alone', rule, {
  valid: ['const a = 1 // one\nconst b = 2 // two\nconst c = 3 // three'],
  invalid: [],
})

// Counted, a directive pads the block it exempts and pushes the report onto its own line,
// out of reach of the directive meant to allow it.
tester.run('a directive is not part of the block it exempts', rule, {
  valid: ['// eslint-disable-next-line no-console -- why\n// one\n// two\nconst a = 1'],
  invalid: [],
})

// Template comments live in an AST getAllComments never sees, and are most of what this
// repo writes.
vue.run('comments inside a Vue template are reached', rule, {
  valid: ['<template>\n  <!-- one\n       two -->\n  <div />\n</template>'],
  invalid: [{ code: '<template>\n  <!-- one\n       two\n       three -->\n  <div />\n</template>', errors: tooLong }],
})
