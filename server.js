import { readFileSync } from 'node:fs'
import uWS from 'uws'
import { R } from './response.js'
import { isDev, port } from './env.js'
import {
  GET_auth_discord,
  GET_link_discord,
  GET_logout,
  // grantRole
  // rand
} from './discord.js'

const clients = new Map()
const toBuf = utf8 => new Uint8Array(Buffer.from(utf8))
const defaultMime = toBuf('application/octet-stream')
const COOKIE_HEADER = toBuf('cookie')
const CONTENT_TYPE = toBuf('Content-Type')
const SEC_WEBSOCKET_KEY = toBuf('sec-websocket-key')
const SEC_WEBSOCKET_PROTOCOL = toBuf('sec-websocket-protocol')
const SEC_WEBSOCKET_EXTENSIONS = toBuf('sec-websocket-extensions')
const mimes = {
  js: toBuf('text/javascript; charset=utf-8'),
  css: toBuf('text/css; charset=utf-8'),
  html: toBuf('text/html; charset=utf-8'),
  json: toBuf('application/json; charset=utf-8'),
}
// image/gif, image/png, image/jpeg, image/bmp, image/webp
// audio/midi, audio/mpeg, audio/webm, audio/ogg, audio/wav

const serveStatic = fileName => {
  const mime = mimes[fileName.split('.').at(-1)] || defaultMime
  if (isDev) return res => {
    res.writeHeader(CONTENT_TYPE, mime)
    res.end(readFileSync(fileName))
  }
  const content = readFileSync(fileName)
  return res => {
    res.writeHeader(CONTENT_TYPE, mime)
    res.end(content)
  }
}

const errToResponse = err => {
  if (err instanceof R) return err
  console.log(err.stack)
  return new R(err.message, { status: 500 })
}

const getSession = req => {
  const cookieStr = req.getHeader(COOKIE_HEADER)
  if (!cookieStr) return
  const x = cookieStr.indexOf(`devazuka-session=`)
  if (x < 0) return
  const y = cookieStr.indexOf('; ', x)
  return cookieStr.slice(x + 17, y < x ? cookieStr.length : y)
}

const handle = action => async (res, req) => {
  const controller = new AbortController
  res.onAborted(() => controller.abort())
  const { signal } = controller
  const url = req.getUrl()
  const params = new URLSearchParams(req.getQuery())
  const session = getSession(req)
  const response = await action({ url, params, session, signal }).catch(errToResponse)
  if (signal.aborted) return
  res.writeStatus(response.status)
  for (const [k, v] of response.headers) res.writeHeader(k, v)
  res.end(response.body)
}

const decode = TextDecoder.prototype.decode.bind(new TextDecoder)
const server = uWS.App()
.ws('/*', {
  // compression: uWS.SHARED_COMPRESSOR,
  // maxPayloadLength: 16 * 1024 * 1024,
  // idleTimeout: 12,
  upgrade: (res, req, context) => {
    const url = req.getUrl()
    const session = getSession(req)

    console.log('An Http connection wants to become WebSocket, URL:', url)
    console.log(req.getHeader('sec-websocket-protocol'))
    console.log('devazuka-session', session)

    res.upgrade(
      { url, session },
      /* Spell these correctly */
      req.getHeader(SEC_WEBSOCKET_KEY),
      req.getHeader(SEC_WEBSOCKET_PROTOCOL),
      req.getHeader(SEC_WEBSOCKET_EXTENSIONS),
      context,
    )
  },
  open: (ws) => {
    console.log('open', ws)
    // clients.add(ws)
    // ws.id = Math.random().toString(36).slice(2, 6).padEnd(4, '0')
    // console.log(ws.id, 'WebSocket connected')
  },
  message: (ws, message, isBinary) => {
    console.log(ws.id, 'WebSocket message', decode(message), isBinary)
    ws.send(message, isBinary)
  },
  close: (ws, code, message) => {
    clients.delete(ws)
    console.log(ws.id, 'WebSocket closed')
  },
})
.get('/auth/discord', handle(GET_auth_discord))
.get('/link/discord', handle(GET_link_discord))
.get('/logout', handle(GET_logout))
.get('/lib/style.css', serveStatic('./lib/style.css'))
.get('/lib/script.js', serveStatic('./lib/script.js'))
.get('/*', serveStatic('./index.html'))
.listen(port, err => console.log(err, { port }))
