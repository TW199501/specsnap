/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'inspector-core-no-framework',
      comment: 'inspector-core must remain framework-agnostic - it MUST NOT import vue, react, or react-dom.',
      severity: 'error',
      from: { path: '^packages/inspector-core/src' },
      to: { path: '^(vue|react|react-dom)($|/)' }
    },
    {
      name: 'inspector-core-no-css',
      comment: 'inspector-core must not emit CSS - styling belongs to wrappers.',
      severity: 'error',
      from: { path: '^packages/inspector-core/src' },
      to: { path: '\\.css$' }
    },
    {
      name: 'specsnap-core-no-inspector',
      comment: 'specsnap-core must not depend on inspector-* packages (dependency direction is one-way).',
      severity: 'error',
      from: { path: '^packages/core/src' },
      to: { path: '^packages/inspector-' }
    },
    {
      name: 'no-circular',
      comment: 'Circular dependencies make the code harder to reason about.',
      severity: 'error',
      from: {},
      to: { circular: true }
    }
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsConfig: { fileName: 'tsconfig.base.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default']
    }
  }
};
