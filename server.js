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
const sessionHeader = toBuf('devazuka-session')
const defaultMime = toBuf('application/octet-stream')
const contentType = toBuf('Content-Type')
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
    res.writeHeader(contentType, mime)
    res.end(readFileSync(fileName))
  }
  const content = readFileSync(fileName)
  return res => {
    res.writeHeader(contentType, mime)
    res.end(content)
  }
}

const errToResponse = err => {
  if (err instanceof R) return err
  console.log(err.stack)
  return new R(err.message, { status: 500 })
}

const handle = action => async (res, req) => {
  const controller = new AbortController
  res.onAborted(() => controller.abort())
  const { signal } = controller
  const url = req.getUrl()
  const params = new URLSearchParams(req.getQuery())
  const session = req.getHeader(sessionHeader)
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
    const session = req.getHeader(sessionHeader)
    console.log('An Http connection wants to become WebSocket, URL:', url)
    console.log(req.getHeader('sec-websocket-protocol'))
    console.log('devazuka-session', session)

    req.forEach((k, v) => console.log({ k, v }))

    res.upgrade(
      { url, session },
      /* Spell these correctly */
      req.getHeader('sec-websocket-key'),
      req.getHeader('sec-websocket-protocol'),
      req.getHeader('sec-websocket-extensions'),
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
