const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.join(__dirname, '..');

function ensureDirectory(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function removeDirectory(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
}

function copyRecursive(sourcePath, targetPath) {
  const stat = fs.statSync(sourcePath);

  if (stat.isDirectory()) {
    ensureDirectory(targetPath);

    for (const entry of fs.readdirSync(sourcePath)) {
      copyRecursive(path.join(sourcePath, entry), path.join(targetPath, entry));
    }

    return;
  }

  ensureDirectory(path.dirname(targetPath));
  fs.copyFileSync(sourcePath, targetPath);
}

function copyOptionalFile(sourcePath, targetPath) {
  if (!fs.existsSync(sourcePath)) {
    return;
  }

  ensureDirectory(path.dirname(targetPath));
  fs.copyFileSync(sourcePath, targetPath);
}

function buildApp(baseDir) {
  const workingRoot = baseDir || rootDir;
  const sourceDir = path.join(workingRoot, 'public');
  const outputDir = path.join(workingRoot, 'build');

  removeDirectory(outputDir);
  copyRecursive(sourceDir, outputDir);
  copyOptionalFile(path.join(workingRoot, '_headers'), path.join(outputDir, '_headers'));

  return {
    outputDir: outputDir,
    rootDir: workingRoot,
    sourceDir: sourceDir,
  };
}

if (require.main === module) {
  const result = buildApp(rootDir);
  console.log(`Built static app into ${path.relative(result.rootDir, result.outputDir)}`);
}

module.exports = {
  buildApp: buildApp,
};