import { METHODS } from 'node:http'
import { User } from './data.js'
import { DOMAIN, DISCORD_SECRET, BOT_TOKEN } from './env.js'

// const SUCCESS = { status: 200, statusText: 'OK' }
// const NOT_FOUND = { status: 404, statusText: 'Not Found' }
// const INTERNAL = { status: 500, statusText: 'Internal Server Error' }
const BAD_REQUEST = { status: 400, statusText: 'Bad Request' }
const UNAUTHORIZED = { status: 401, statusText: 'Unauthorized' }
const TYPE_JSON = { 'content-type': 'application/json' }

export const rand = () =>
  Math.random().toString(36).slice(2, 12).padEnd(10, '0')

const GUILD = '957694647084400761'
const DISCORD_CLIENT = '826974634069983282'
const oauthStates = new Map()

// purge oauthStates every minutes
setInterval(() => {
  const now = Date.now()
  for (const [state, expireAt] of oauthStates) {
    expireAt > now && oauthStates.delete(state)
  }
}, 60000)

const discord = method => async (path, { user, ...opts } = {}) => {
  const headers = opts.headers || (opts.headers = {})
  headers['content-type'] || (headers['content-type'] = 'application/json')
  if (user) {
    if (user.expireAt > Date.now()) {
      // TODO: refresh OAuth
    }
    headers.authorization = `Bearer ${user.token}`
  } else if (!headers.authorization) {
    headers.authorization = `Bot ${BOT_TOKEN}`
  }
  const res = await fetch(`https://discordapp.com/api/${path}`, opts)
  try {
    if (res.status === 204) return
    const result = await res.json()
    if (result.error) throw new Response(result.error_description, res.status)
    return result
  } catch (err) {
    throw new Response(res.statusText, res.status)
  }
}

METHODS.forEach(method => discord[method] = discord(method))

const getOrCreateUser = async () => {
  // authResponse return `expire_in` but it's a relative value
  // Saving the date of the request to convert to an absolute value
  const now = Date.now()
  const auth = await discord.POST('oauth2/token', {
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      // identify for getting user Id
      // guild.join to make them join the discord server
      scope: 'identify guilds.join',
      client_id: DISCORD_CLIENT,
      client_secret: DISCORD_SECRET,
      grant_type: 'authorization_code',
      code,
    }),
  })

  const token = auth.access_token
  const refresh = auth.refresh_token
  const expireAt = auth.expire_in * 1000 + now

  const { id, username, discriminator } = await discord.GET('users/@me', {
    headers: { authorization: `Bearer ${token}` },
  })

  const login = `${username}#${discriminator}`
  const existingUser = User.find.id(id)
  if (existingUser) {
    existingUser.update({ login, token, expireAt, refresh })
    return existingUser
  }
  const session = `${Date.now().toString(36)}-${rand()}`
  const user = User({
    id: BigInt(id),
    login,
    level: 0,
    session,
    token,
    expireAt,
    refresh,
  })

  // join discord server
  await discord.PUT(`guilds/${GUILD}/members/${user.id}`, { user })
}

// GET /auth/discord
export const GET_auth_discord = async ({ url }) => {
  // Link open when redirected from discord OAuth
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  if (!code || !state) return new Response('Missing Params', BAD_REQUEST)

  // We check that the OAuth request state exist and has not expired
  if (!oauthStates.has(state)) return new Response('Bad State', UNAUTHORIZED)

  // If it's the first time we have to create the user
  const { login, session, level } = getOrCreateUser()

  // Redirect to the connected app while setting the secure auth cookie
  return new Response(null, {
    status: 301,
    headers: {
      location: `/?${new URLSearchParams({ login, level })}`,
      'set-cookie': [
        `devazuka-session=${session}`,
        'max-age=31536000',
        'path=/',
        `domain=${DOMAIN}`,
        'httponly',
        'samesite=strict',
        'secure',
      ].join('; '),
    },
  })
}

// GET /link/discord
export const GET_link_discord = async ({ session }) => {
  // TODO: check if session is already active

  // Generate a random OAuth state
  const state = `${rand()}-${rand()}`

  // Save the random state in memory with a 15min expiration
  oauthStates.set(state, Date.now() + 60000 * 15)

  // Redirect to discord OAuth authorize link
  const location = `https://discordapp.com/api/oauth2/authorize?${new URLSearchParams({
    client_id: DISCORD_CLIENT,
    response_type: 'code',
    scope: 'identify email guilds.join',
    state,
  })}`
  return new Response(null, { headers: { location }, status: 301 })
}

// GET /logout
export const GET_logout = async ({ session }) => {
  // Clear Session
  const user = User.find.session(session)
  user?.update({ session: undefined })

  // Clear cookie
  const cookie = `devazuka-session=; path=/; domain=${DOMAIN}; max-age=-1`
  return new Response(null, {
    status: 301,
    headers: { location: '/', 'set-cookie': cookie },
  })
}

const jsRoleList = [
  { level: 1, id: '1004348867065675867' },
  { level: 2, id: '1004349712477986846' },
  { level: 3, id: '1004349748993589258' },
  { level: 4, id: '1004349786012516422' },
  { level: 5, id: '1004349825912934431' },
  { level: 6, id: '1004349862617296926' },
  { level: 7, id: '1004349892673683537' },
  { level: 8, id: '1004350030569799812' },
  { level: 9, id: '1004350068897353749' },
]
const jsRolesByLevel = Object.fromEntries(jsRoleList.map(role => [role.level, role]))
const jsRolesById = Object.fromEntries(jsRoleList.map(role => [role.id, role]))

export const grantJSRole = async (user, level) => {
  const role = jsRolesByLevel[level]
  if (!role) throw new Response('Invalid JS level', BAD_REQUEST)
  const member = await discord.GET(`guilds/${GUILD}/members/${user.id}`, { user })
  // find the currently highest js role
  const [highest] = member.roles
    .map(roleId => jsRolesById[roleId])
    .filter(Boolean)
    .sort((a, b) => b.level - a.level)

  if (highest?.level >= role.level) return

  // TODO: maybe check if we are leveling just one level?
  const roles = [...member.roles.filter(roleId => jsRolesById[roleId]), role]
  return discord.PATCH(`guilds/${GUILD}/members/${user.id}`, {
    body: JSON.stringify({ roles }),
    user,
  })
}

