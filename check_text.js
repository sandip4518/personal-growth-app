const fs = require('fs');
const glob = require('glob');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const files = glob.sync('app/**/*.tsx');
let foundError = false;

files.forEach(file => {
  const code = fs.readFileSync(file, 'utf8');
  try {
    const ast = parser.parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript']
    });

    traverse(ast, {
      JSXText(path) {
        const text = path.node.value;
        if (text.trim() === '') return; // Whitespace only is fine
        
        let parentType = path.parent.type;
        if (parentType !== 'JSXElement' && parentType !== 'JSXFragment') return;

        let parentName = path.parent.openingElement ? path.parent.openingElement.name.name : 'Fragment';

        if (parentName !== 'Text' && parentName !== 'TextInput' && parentName !== 'ThemedText') {
          console.log(`[Error] Stray text "${text.trim()}" in ${file} inside <${parentName}> tag. Line ${path.node.loc.start.line}`);
          foundError = true;
        }
      },
      JSXExpressionContainer(path) {
        const expression = path.node.expression;
        let parentType = path.parent.type;
        if (parentType !== 'JSXElement' && parentType !== 'JSXFragment') return; // Only care about children, not attributes

        let parentName = path.parent.openingElement ? path.parent.openingElement.name.name : 'Fragment';
        
        if (parentName !== 'Text' && parentName !== 'TextInput' && parentName !== 'ThemedText') {
          if (expression.type === 'StringLiteral' || expression.type === 'NumericLiteral' || expression.type === 'TemplateLiteral') {
             console.log(`[Error] Stray literal expression "${expression.value || 'template'}" in ${file} inside <${parentName}> tag. Line ${path.node.loc.start.line}`);
             foundError = true;
          }
          if (expression.type === 'LogicalExpression' && expression.operator === '&&') {
             // Let's check the right side of the && expression
             const right = expression.right;
             if (right.type === 'StringLiteral' || right.type === 'NumericLiteral') {
                 console.log(`[Error] Stray literal && expression in ${file} inside <${parentName}> tag. Line ${path.node.loc.start.line}`);
                 foundError = true;
             }
          }
        }
      }
    });
  } catch (err) {
    console.error(`Failed to parse ${file}: ${err.message}`);
  }
});

if (!foundError) {
  console.log("No obvious stray text strings found by refined checks.");
}
