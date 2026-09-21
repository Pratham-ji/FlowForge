const fs = require('fs');
const path = require('path');

function walk(dir, fileList) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            walk(filePath, fileList);
        } else if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
            fileList.push(filePath);
        }
    }
    return fileList;
}

const allFiles = walk('frontend/src', []);
let failed = false;

allFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
        const importPath = match[1];
        if (importPath.startsWith('.')) {
            const absoluteImport = path.resolve(path.dirname(file), importPath);
            // Check if exact file exists, or with .ts, .tsx, /index.ts, /index.tsx
            const exts = ['', '.ts', '.tsx', '/index.ts', '/index.tsx'];
            let found = false;
            let actualMatch = null;
            for (const ext of exts) {
                if (fs.existsSync(absoluteImport + ext)) {
                    // Check case sensitivity
                    const dir = path.dirname(absoluteImport + ext);
                    const base = path.basename(absoluteImport + ext);
                    const realFiles = fs.readdirSync(dir);
                    if (!realFiles.includes(base)) {
                        console.error(`Case mismatch in ${file}: imports ${importPath} but actual file is ${base}`);
                        failed = true;
                    }
                    found = true;
                    break;
                }
            }
            if (!found && !absoluteImport.includes('.css')) {
                console.error(`File not found in ${file}: imports ${importPath}`);
                failed = true;
            }
        }
    }
});
if (!failed) console.log("All imports matched perfectly.");
