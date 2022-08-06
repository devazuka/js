import { readFileSync } from 'node:fs'
import uWS from 'uws'
import { isDev, port } from './env.js'
import {
  GET_auth_discord,
  GET_link_discord,
  GET_logout,
  // grantRole
  // rand
} from './discord.js'

const clients = new Map()
const getMime = ext => {
  switch (ext) {
    case 'js': return 'text/javascript; charset=utf-8'
    case 'css': return 'text/css; charset=utf-8'
    case 'html': return 'text/html; charset=utf-8'
    case 'json': return 'application/json; charset=utf-8'
    // image/gif, image/png, image/jpeg, image/bmp, image/webp
    // audio/midi, audio/mpeg, audio/webm, audio/ogg, audio/wav
    default: return 'application/octet-stream'
  }
}
const serveStatic = fileName => {
  const mime = getMime(fileName.split('.').at(-1))
  if (isDev) return res => {
    res.writeHeader("Content-Type", mime)
    res.end(readFileSync(fileName))
  }
  const content = readFileSync(fileName)
  return res => {
    res.writeHeader("Content-Type", mime)
    res.end(content)
  }
}

const sendResponse = (res, response) => {
  for (const [k, v] of response.headers) res.writeHeader(k, v)
  res.writeStatus(response.status)
  res.end(response.body)
}

const errToResponse = err => {
  if (err instanceof Response) return err
  console.log(err.stack)
  return new Response(err.message, { status: 500 })
}

const handle = action => async (res, req) => {
  const controller = new AbortController
  res.onAborted(() => controller.abort())
  const { signal } = controller
  const url = req.getUrl()
  const session = req.getHeader('devazuka-session')
  const response = await action({ url, session, signal }).catch(errToResponse)
  signal.aborted || sendResponse(res, response)
}

const decode = TextDecoder.prototype.decode.bind(new TextDecoder)
const server = uWS.App()
.ws('/*', {
  // compression: uWS.SHARED_COMPRESSOR,
  // maxPayloadLength: 16 * 1024 * 1024,
  // idleTimeout: 12,
  upgrade: (res, req, context) => {
    const url = req.getUrl()
    const session = req.getHeader('devazuka-session')
    console.log('An Http connection wants to become WebSocket, URL:', url)
    console.log(req.getHeader('sec-websocket-protocol'))
    console.log('devazuka-session', session)


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
