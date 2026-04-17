import { join } from 'path'
import { getAppDir } from '../main/utils'
import fs from 'fs'

export interface BuildInfo {
    version: string
    buildTime: string
    git: {
        hash: string
        branch: string
        dirty: boolean
    }
}

let cachedBuildInfo: BuildInfo | undefined

export function getBuildInfo(): BuildInfo {
    if (cachedBuildInfo) {
        return cachedBuildInfo
    }

    try {
        const buildInfoPath = join(getAppDir(), 'build', 'build-info.json')
        const data = fs.readFileSync(buildInfoPath, 'utf8')
        cachedBuildInfo = JSON.parse(data)
        return cachedBuildInfo!
    } catch {
        return {
            version: 'unknown',
            buildTime: 'unknown',
            git: {
                hash: 'unknown',
                branch: 'unknown',
                dirty: false,
            },
        }
    }
}
