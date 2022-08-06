export const isDev = process.env.NODE_ENV === 'development'
export const DISCORD_SECRET = process.env.JANUS_SECRET
export const BOT_TOKEN = process.env.JANUS_TOKEN
export const port = Number(process.env.PORT) || 9001
export const DOMAIN = process.env.DOMAIN || 'js.devazuka.com'