import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')

function getGitInfo() {
    try {
        const commit = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim()
        const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim()
        return { commit, branch }
    } catch {
        return { commit: 'unknown', branch: 'unknown' }
    }
}

function generateBuildInfo() {
    const packageJson = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf-8'))
    const buildNumber = process.env.BUILD_NUMBER || Date.now().toString()
    const gitInfo = getGitInfo()

    const buildInfo = {
        version: packageJson.version,
        buildNumber,
        buildTime: new Date().toISOString(),
        gitCommit: gitInfo.commit,
        gitBranch: gitInfo.branch,
    }

    const outputDir = join(rootDir, 'src', 'shared', 'generated')
    if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true })
    }

    const content = `// Auto-generated at build time\nimport type { BuildInfo } from '../constants/app'\nexport const BUILD_INFO: BuildInfo = ${JSON.stringify(buildInfo, null, 2)}\n`

    writeFileSync(join(outputDir, 'build-info.ts'), content, 'utf-8')
    console.log('[build:pre] Build info generated:', buildInfo)
}

generateBuildInfo()
