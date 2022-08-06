import { readFileSync } from 'node:fs'
import uWS from 'uws'
import {
  GET_auth_discord,
  GET_link_discord,
  GET_logout,
  // grantRole
  // rand
} from './discord.js'

const clients = new Map()
const port = process.env.PORT || 9001
const getMime = ext => {
  switch (ext) {
    case 'js': return 'text/javascript; charset=utf-8'
    case 'json': return 'application/json; charset=utf-8'
    case 'css': return 'text/css; charset=utf-8'
    case 'html': return 'text/html; charset=utf-8'
    // image/gif, image/png, image/jpeg, image/bmp, image/webp
    // audio/midi, audio/mpeg, audio/webm, audio/ogg, audio/wav
    default: return 'application/octet-stream'
  }
}
const serveStatic = fileName => {
  const mime = getMime(fileName.split('.').at(-1))
  if (process.env.NODE_ENV === 'development') return res => {
    res.writeHeader("Content-Type", mime)
    res.end(readFileSync(fileName))
  }
  const content = readFileSync(fileName)
  return res => {
    res.writeHeader("Content-Type", mime)
    res.end(content)
  }
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
.get('/auth/discord', GET_auth_discord)
.get('/link/discord', GET_link_discord)
.get('/logout', GET_logout)
.get('/lib/style.css', serveStatic('./lib/style.css'))
.get('/lib/script.js', serveStatic('./lib/script.js'))
.get('/*', serveStatic('./index.html'))
.listen(port, err => console.log(err, { port }))
