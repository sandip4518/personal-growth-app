const fs = require('fs');
const glob = require('glob');

const files = glob.sync('app/**/*.tsx');

files.forEach(file => {
  const code = fs.readFileSync(file, 'utf8');
  // very crude regex to find text between tags that IS NOT whitespace and NOT inside curly braces
  const lines = code.split('\n');
  lines.forEach((line, index) => {
    // try to find > text < where text is not empty
    const match = line.match(/>([^<{]+)</g);
    if (match) {
        match.forEach(m => {
          const inner = m.substring(1, m.length - 1).trim();
          if (inner.length > 0 && !line.includes('<Text') && !line.includes('</Text>') && !line.includes('</ThemedText>') && !line.includes('<ThemedText')) {
             console.log(`[Regex] Possible stray text on line ${index + 1} of ${file}: "${inner}"`);
          }
        });
    }
  });
});
