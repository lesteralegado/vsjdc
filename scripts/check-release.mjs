import { loadEnv } from 'vite'
import { releaseErrors } from './release-config.mjs'

const env = { ...loadEnv('production', process.cwd(), 'VITE_'), ...process.env }
const target = process.env.VERCEL_ENV || process.env.RELEASE_TARGET
const errors = releaseErrors(env, target)
if (errors.length) {
  console.error('Release configuration blocked:\n' + errors.map(e => `- ${e}`).join('\n'))
  process.exitCode = 1
} else console.log(`PASS: ${target} browser configuration. Hosted settings and clinic acceptance still require review.`)
