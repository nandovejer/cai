const fs = require('fs');
const path = require('path');

function minifyCSS(content) {
    return content
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
    .replace(/\s+/g, ' ')             // Reduce all spaces to a single space
    .replace(/\s*{\s*/g, '{')         // Remove spaces before and after '{'
    .replace(/\s*}\s*/g, '}')         // Remove spaces before and after '}'
    .replace(/\s*;\s*/g, ';')         // Remove spaces before and after ';'
    .replace(/\s*:\s*/g, ':')         // Remove spaces before and after ':'
    .trim();                          // Remove spaces at the beginning and end
    
}

function bundleAndMinifyCSS(mainCSSPath, outputFilePath) {
    let bundledCSS = '';
    const data = fs.readFileSync(mainCSSPath, 'utf8');
    const importRegex = /@import\s+"(.+?)";/g;
    let match;

    while ((match = importRegex.exec(data)) !== null) {
        const importPath = match[1];
        const fullPath = path.join(path.dirname(mainCSSPath), importPath);
        const importedCSS = fs.readFileSync(fullPath, 'utf8');
        bundledCSS += importedCSS + '\n';
    }

    const minifiedCSS = minifyCSS(bundledCSS);

    fs.writeFileSync(outputFilePath, minifiedCSS, 'utf8');
    console.log('Archivo bundle minificado creado exitosamente:', outputFilePath);
}


// Uso de la función
bundleAndMinifyCSS('./cai/cai.css', './cai/cai.min.css');
