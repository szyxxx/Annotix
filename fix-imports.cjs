const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const srcDir = path.join(__dirname, 'src');

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);
  arrayOfFiles = arrayOfFiles || [];
  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        arrayOfFiles.push(path.join(dirPath, "/", file));
      }
    }
  });
  return arrayOfFiles;
}

const allFiles = getAllFiles(srcDir);

// Mapping of absolute module paths (relative to src) to their new absolute paths
// Everything used to be at the root of src
const oldToNew = {
  'application': 'core/application',
  'domain': 'core/domain',
  'infrastructure': 'core/infrastructure',
  'runtime': 'core/runtime',
  'components': 'ui/components',
  'hooks': 'ui/hooks',
  'store': 'ui/stores',
  'stores': 'ui/stores',
  'lib': 'shared/lib',
  'types': 'shared/types',
  'core': 'shared/core' // old core (eventBus, container)
};

allFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf-8');
  let original = content;

  // Regex to match imports: import ... from "..."
  const importRegex = /(import|export)\s+(?:type\s+)?.*?\s+from\s+['"]([^'"]+)['"]/g;
  
  content = content.replace(importRegex, (match, type, importPath) => {
    if (!importPath.startsWith('.')) return match;

    // What was the old absolute path from src?
    // We don't know the old path of THIS file easily, but we know its NEW path.
    // Let's resolve the import from the NEW path to see if it exists.
    const resolvedPath = path.resolve(path.dirname(file), importPath);
    if (fs.existsSync(resolvedPath) || fs.existsSync(resolvedPath + '.ts') || fs.existsSync(resolvedPath + '.tsx') || fs.existsSync(resolvedPath + '/index.ts')) {
      return match; // It's still valid!
    }

    // If it's invalid, it's probably because it's pointing to the OLD location, 
    // OR this file itself moved, so its relative path changed.
    
    // Let's find the target file.
    // What was this file's old location?
    let oldFilePath = file;
    // Reverse map: if it's in core/application, it used to be in application
    for (const [oldDir, newDir] of Object.entries(oldToNew)) {
      if (file.includes(path.normalize('src/' + newDir))) {
        oldFilePath = file.replace(path.normalize('src/' + newDir), path.normalize('src/' + oldDir));
        break;
      }
    }

    // Now resolve the import path from the OLD file location!
    const oldResolvedTarget = path.resolve(path.dirname(oldFilePath), importPath);
    
    // What is the old absolute path from src?
    let targetRelativeFromSrc = path.relative(srcDir, oldResolvedTarget).replace(/\\/g, '/');
    
    // If it ends with .ts, strip it
    targetRelativeFromSrc = targetRelativeFromSrc.replace(/\.tsx?$/, '');

    // Now map targetRelativeFromSrc to its NEW location
    let newTargetRelativeFromSrc = targetRelativeFromSrc;
    for (const [oldDir, newDir] of Object.entries(oldToNew)) {
      if (targetRelativeFromSrc === oldDir || targetRelativeFromSrc.startsWith(oldDir + '/')) {
        newTargetRelativeFromSrc = targetRelativeFromSrc.replace(oldDir, newDir);
        break;
      }
    }

    // Now compute the new relative path from the NEW file location to the NEW target location
    const newTargetAbsolute = path.resolve(srcDir, newTargetRelativeFromSrc);
    let newImportPath = path.relative(path.dirname(file), newTargetAbsolute).replace(/\\/g, '/');
    if (!newImportPath.startsWith('.')) {
      newImportPath = './' + newImportPath;
    }

    return match.replace(importPath, newImportPath);
  });

  if (content !== original) {
    fs.writeFileSync(file, content);
  }
});
console.log("Imports fixed.");
