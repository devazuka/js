import * as db from './db.js'

// const SUCCESS = { status: 200, statusText: 'OK' }
// const NOT_FOUND = { status: 404, statusText: 'Not Found' }
// const INTERNAL = { status: 500, statusText: 'Internal Server Error' }
const BAD_REQUEST = { status: 400, statusText: 'Bad Request' }
const UNAUTHORIZED = { status: 401, statusText: 'Unauthorized' }
const TYPE_JSON = { 'content-type': 'application/json' }

export const rand = () =>
  Math.random().toString(36).slice(2, 12).padEnd(10, '0')

const jsRoles = new Map([
  ['js-1', '1004348867065675867'],
  ['js-2', '1004349712477986846'],
  ['js-3', '1004349748993589258'],
  ['js-4', '1004349786012516422'],
  ['js-5', '1004349825912934431'],
  ['js-6', '1004349862617296926'],
  ['js-7', '1004349892673683537'],
  ['js-8', '1004350030569799812'],
  ['js-9', '1004350068897353749'],
])

const GUILD = '957694647084400761'
const DISCORD_CLIENT = '826974634069983282'
const DISCORD_SECRET = process.env.JANUS_SECRET
const BOT_TOKEN = process.env.JANUS_TOKEN

const oauthStates = new Map()
// purge oauthStates every minutes
setInterval(() => {
  const now = Date.now()
  for (const [state, expireAt] of oauthStates) {
    expireAt > now && oauthStates.delete(state)
  }
}, 60000)

const getOAuthState = () => {
  const state = `${rand()}-${rand()}`
  oauthStates.set(state, Date.now() + 60000 * 15)
  return state
}

const DISCORD = 'https://discordapp.com/api'
const joinGuild = async ({ discordId, request, body }) => {
  const url = `${DISCORD}/guilds/${GUILD}/members/${discordId}`
  const join = await fetch(url, { ...request, body: JSON.stringify(body) })
  if (join.status !== 204) return { reply: join, roles: body.roles }
  const user = await (await fetch(url)).json()
  body.roles = [...new Set([...user.roles, ...body.roles])]
  request.method = 'PATCH'
  const reply = await fetch(url, { ...request, body: JSON.stringify(body) })
  return { reply, roles: body.roles }
}

const getOrCreateUser = async = () => {
  const now = Date.now()
  const authResponse = await fetch(`${DISCORD}/oauth2/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      scope: 'identify guilds.join',
      client_id: DISCORD_CLIENT,
      client_secret: DISCORD_SECRET,
      grant_type: 'authorization_code',
      code,
    }),
  })

  const auth = await authResponse.json()
  if (auth.error) return new Response(auth.error_description, BAD_REQUEST)
  const token = auth.access_token
  const refresh = auth.refresh_token
  const expireAt = auth.expire_in * 1000 + now

  const userResponse = await fetch(`${DISCORD}/users/@me`, {
    headers: { authorization: `Bearer ${token}` },
  })

  const { id, username, discriminator } = await userResponse.json()
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
  const join = await joinGuild({
    discordId,
    request: {
      method: 'PUT',
      headers: { authorization: `Bot ${BOT_TOKEN}`, ...TYPE_JSON },
    },
    body: { access_token: token, roles: [jsRoles.get('js-1')] },
  })

  join.reply.ok || console.error('Unable to join discord:', join.reply)
  return user
}

// GET /auth/discord
export const GET_auth_discord = async ({ url }) => {
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  if (!code || !state) return new Response('Missing Params', BAD_REQUEST)
  if (!oauthStates.has(state)) return new Response('Bad State', UNAUTHORIZED)
  const { login, session, level } = getOrCreateUser()
  return new Response(null, {
    status: 301,
    headers: {
      location: `/?${new URLSearchParams({ login, level })}`,
      'set-cookie': [
        `devazuka-session=${session}`,
        'max-age=31536000',
        'path=/',
        `domain=${url.hostname}`,
        'httponly',
        'samesite=strict',
        'secure',
      ].join('; '),
    },
  })
}

// GET /link/discord
export const GET_link_discord = async ({ session }) => {
  const state = getOAuthState()
  const location = `https://discordapp.com/api/oauth2/authorize?${new URLSearchParams({
    client_id: DISCORD_CLIENT,
    response_type: 'code',
    scope: 'identify email guilds.join',
    state,
  })}`
  return new Response(null, { headers: { location }, status: 301 })
}

// GET /logout
export const GET_logout = async ({ session, url: { hostname } }) => {
  // Clear Session
  const user = User.find.session(session)
  user?.update({ session: undefined })

  // Clear cookie
  const cookie = `devazuka-session=; path=/; domain=${hostname}; max-age=-1`
  return new Response(null, {
    status: 301,
    headers: { location: '/', 'set-cookie': cookie },
  })
}

const discordFetch = async (user, path, ...opts) => {
  if (user.expireAt > Date.now()) {
    // TODO: refresh OAuth

  }

  const res = await fetch(`${DISCORD}/${path}/${user.id}`)
  // TODO: handle !res.ok ?
  return res.json()
}

const jsRolesIds = new Set(jsRoles.values())
const isJsRole = id => jsRolesIds.has(id)
export const grantRole = async (user, roleName) => {
  const role = jsRoles.get(roleName)
  const member = await discordFetch(user, `guilds/${GUILD}/members`)
  if (member.roles.includes(role)) return
  const roles = [...member.roles.filter(isJsRole), role]
  const result = await discordFetch(`guilds/${GUILD}/members`, {
    method: 'PATCH',
    body: JSON.stringify({ roles }),
  })

  // TODO: check the results, confirm if all is good 
  console.log(result)
}

