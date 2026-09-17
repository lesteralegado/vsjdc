export function releaseErrors(env, target) {
  const errors = []
  const allowed = new Set(['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY', 'VITE_DEMO_DATA', 'VITE_DEMO_APPOINTMENT_DATE', 'VITE_BOOKING_ENABLED'])
  // Explicit public Vercel metadata, not a blanket VITE_VERCEL_* exception.
  const platform = ['ENV', 'TARGET_ENV', 'URL', 'BRANCH_URL', 'PROJECT_PRODUCTION_URL', 'HASH_SALT', 'GIT_PROVIDER', 'GIT_REPO_SLUG', 'GIT_REPO_OWNER', 'GIT_REPO_ID', 'GIT_COMMIT_REF', 'GIT_COMMIT_SHA', 'GIT_COMMIT_MESSAGE', 'GIT_COMMIT_AUTHOR_LOGIN', 'GIT_COMMIT_AUTHOR_NAME', 'GIT_PULL_REQUEST_ID']
  for (const name of platform) allowed.add(`VITE_VERCEL_${name}`)
  for (const key of Object.keys(env)) {
    if (key.startsWith('VITE_') && !allowed.has(key)) errors.push(`Unreviewed browser variable: ${key}`)
  }
  const url = env.VITE_SUPABASE_URL ?? ''
  if (!/^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(url)) errors.push('Set a hosted Supabase project URL.')
  if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '')) errors.push('Use a browser-safe Supabase publishable key.')
  for (const key of ['VITE_DEMO_DATA', 'VITE_BOOKING_ENABLED']) {
    if (!['true', 'false'].includes(env[key])) errors.push(`Set ${key} explicitly to true or false.`)
  }
  if (!['preview', 'production'].includes(target)) errors.push('Choose preview or production explicitly.')
  if (target === 'production') {
    if (url.includes('sqqwjiuskzgwxvxukmxi')) errors.push('Production cannot use the development database.')
    if (env.VITE_DEMO_DATA !== 'false' || env.VITE_DEMO_APPOINTMENT_DATE) errors.push('Remove demo settings before production.')
  }
  return errors
}
