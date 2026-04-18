// eslint-disable-next-line @typescript-eslint/no-require-imports
const { execSync } = require('child_process')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const process = require('process')

// 生成 buildNumber：年月日时分秒
const now = new Date()
const buildNumber = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`

console.log(`Build Number: ${buildNumber}`)

// 获取平台参数
const platform = process.argv[2] || 'win'

let cmd = ''
if (platform === 'win') {
    cmd = `yarn run build && electron-builder --win`
} else if (platform === 'mac') {
    cmd = `yarn run build && electron-builder --mac`
} else if (platform === 'linux') {
    cmd = `yarn run build && electron-builder --linux`
} else if (platform === 'all') {
    cmd = `yarn run build && electron-builder --win --mac --linux`
}

try {
    // 使用环境变量传递 buildNumber
    execSync(cmd, {
        stdio: 'inherit',
        shell: true,
        env: {
            ...process.env,
            BUILD_NUMBER: buildNumber
        }
    })
} catch (error) {
    console.error('Build failed:', error)
    process.exit(1)
}
