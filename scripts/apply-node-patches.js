const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');

const patches = [
  {
    file: path.join(
      projectRoot,
      'node_modules',
      'expo-modules-core',
      'android',
      'src',
      'main',
      'java',
      'expo',
      'modules',
      'adapters',
      'react',
      'permissions',
      'PermissionsService.kt'
    ),
    search: 'return requestedPermissions.contains(permission)',
    replace: 'return requestedPermissions?.contains(permission) == true',
  },
  {
    file: path.join(
      projectRoot,
      'node_modules',
      'react-native-screens',
      'android',
      'src',
      'main',
      'java',
      'com',
      'swmansion',
      'rnscreens',
      'ScreenStack.kt'
    ),
    search: 'if (drawingOpPool.isEmpty()) DrawingOp() else drawingOpPool.removeLast()',
    replace: 'if (drawingOpPool.isEmpty()) DrawingOp() else drawingOpPool.removeAt(drawingOpPool.size - 1)',
  },
];

for (const patch of patches) {
  if (!fs.existsSync(patch.file)) {
    console.warn(`[patches] Skipped missing file: ${path.relative(projectRoot, patch.file)}`);
    continue;
  }

  const source = fs.readFileSync(patch.file, 'utf8');
  if (source.includes(patch.replace)) {
    continue;
  }

  if (!source.includes(patch.search)) {
    console.warn(`[patches] Expected text not found in ${path.relative(projectRoot, patch.file)}`);
    continue;
  }

  fs.writeFileSync(patch.file, source.replace(patch.search, patch.replace));
  console.log(`[patches] Applied ${path.relative(projectRoot, patch.file)}`);
}
