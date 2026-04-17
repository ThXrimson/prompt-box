import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import dayjs from 'dayjs'

const BUILD_INFO_DIR = path.join(process.cwd(), 'build')
const BUILD_INFO_FILE = path.join(BUILD_INFO_DIR, 'build-info.json')

function getGitCommitHash() {
    try {
        return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim().slice(0, 8)
    } catch {
        return 'unknown'
    }
}

function getGitBranch() {
    try {
        return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim()
    } catch {
        return 'unknown'
    }
}

function getGitDirty() {
    try {
        const status = execSync('git status --porcelain', { encoding: 'utf8' }).trim()
        return status.length > 0
    } catch {
        return false
    }
}

function generateBuildInfo() {
    const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'))

    const buildInfo = {
        version: packageJson.version,
        buildTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        git: {
            hash: getGitCommitHash(),
            branch: getGitBranch(),
            dirty: getGitDirty(),
        },
    }

    if (!fs.existsSync(BUILD_INFO_DIR)) {
        fs.mkdirSync(BUILD_INFO_DIR, { recursive: true })
    }

    fs.writeFileSync(BUILD_INFO_FILE, JSON.stringify(buildInfo, null, 2))
    console.log('[build-info] Generated:', BUILD_INFO_FILE)
    console.log('[build-info]', JSON.stringify(buildInfo))
}

generateBuildInfo()
