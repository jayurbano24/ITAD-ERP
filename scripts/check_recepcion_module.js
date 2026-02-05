const ts = require('typescript')
const fs = require('fs')
const path = require('path')
const filePath = path.join(__dirname, '..', 'src', 'app', 'recepcion', 'components', 'RecepcionModule.tsx')
const code = fs.readFileSync(filePath, 'utf-8')
const sourceFile = ts.createSourceFile('RecepcionModule.tsx', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
const diagnostics = sourceFile.parseDiagnostics.map((diagnostic) => {
  const { line, character } = sourceFile.getLineAndCharacterOfPosition(diagnostic.start ?? 0)
  return {
    message: diagnostic.messageText,
    line: line + 1,
    character: character + 1,
  }
})
console.log(JSON.stringify(diagnostics, null, 2))
