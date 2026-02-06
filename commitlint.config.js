module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // New feature
        'fix',      // Bug fix
        'docs',     // Documentation changes
        'style',    // Code formatting (no code change)
        'refactor', // Code refactoring
        'perf',     // Performance improvements
        'test',     // Adding or updating tests
        'chore',    // Maintenance tasks
        'ci',       // CI configuration
        'build',    // Build system changes
        'security'   // Security fixes
      ]
    ],
    'subject-case': [2, 'never', ['start-case', 'pascal-case', 'upper-case']],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'header-max-length': [2, 'always', 72],
    'body-max-line-length': [2, 'always', 72],
    'body-leading-blank': [2, 'always'],
    'body-missing': [1, 'never'],
    'footer-leading-blank': [1, 'always'],
    'footer-max-line-length': [2, 'always', 72]
  }
};
