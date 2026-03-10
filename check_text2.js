const fs = require('fs');
const glob = require('glob');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const files = glob.sync('app/**/*.tsx');

files.forEach(file => {
  const code = fs.readFileSync(file, 'utf8');
  try {
    const ast = parser.parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript']
    });

    traverse(ast, {
      JSXExpressionContainer(path) {
        let parentType = path.parent.type;
        if (parentType !== 'JSXElement' && parentType !== 'JSXFragment') return;

        let parentName = path.parent.openingElement ? path.parent.openingElement.name.name : 'Fragment';
        if (parentName !== 'Text' && parentName !== 'TextInput' && parentName !== 'ThemedText') {
           const exprType = path.node.expression.type;
           // If it resolves to JSX elements, it's fine.
           // E.g., logical, conditional, map, call. We log them to see.
           
           if (exprType === 'Identifier') {
               console.log(`[Warn] Bare Identifier {${path.node.expression.name}} inside <${parentName}> in ${file}:${path.node.loc.start.line}`);
           }
           if (exprType === 'MemberExpression') {
               console.log(`[Warn] Bare MemberExpression {${path.node.expression.property.name || 'computed'}} inside <${parentName}> in ${file}:${path.node.loc.start.line}`);
           }
        }
      }
    });
  } catch (err) {
    console.error(`Failed to parse ${file}: ${err.message}`);
  }
});
