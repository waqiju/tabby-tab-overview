import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')

const pluginsRoot =
  process.env.TABBY_PLUGINS_DIR ||
  '/mnt/c/Users/qianjun/AppData/Roaming/tabby/plugins'

const targetDir = path.join(pluginsRoot, 'node_modules', 'tabby-tab-overview')

fs.mkdirSync(targetDir, { recursive: true })

// Write a clean package.json without devDependencies and without node_modules
const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'))
const deployPkg = {
  name: pkg.name,
  version: pkg.version,
  description: pkg.description,
  author: pkg.author || 'local',
  keywords: pkg.keywords,
  main: pkg.main,
  types: pkg.types,
  license: pkg.license,
  peerDependencies: pkg.peerDependencies,
}
fs.writeFileSync(
  path.join(targetDir, 'package.json'),
  JSON.stringify(deployPkg, null, 2) + '\n',
  'utf8',
)

// Copy dist/ cleanly
const srcDist = path.join(projectRoot, 'dist')
const dstDist = path.join(targetDir, 'dist')
fs.rmSync(dstDist, { recursive: true, force: true })
fs.cpSync(srcDist, dstDist, { recursive: true })

// Ensure %APPDATA%\tabby\plugins\package.json exists and tracks the plugin
const rootPkgPath = path.join(pluginsRoot, 'package.json')
let rootPkg = { dependencies: {} }
if (fs.existsSync(rootPkgPath)) {
  try {
    rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'))
  } catch {
    rootPkg = { dependencies: {} }
  }
}
if (!rootPkg.dependencies || typeof rootPkg.dependencies !== 'object') {
  rootPkg.dependencies = {}
}
rootPkg.dependencies[pkg.name] = pkg.version
fs.writeFileSync(rootPkgPath, JSON.stringify(rootPkg, null, 2) + '\n', 'utf8')

console.log(`Deployed ${pkg.name}@${pkg.version} -> ${targetDir}`)
