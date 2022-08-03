import { readFileSync } from 'fs'
import uWS from 'uws'

const clients = new Set()
const port = process.env.PORT || 9001
const index = readFileSync('./index.html')
const decode = TextDecoder.prototype.decode.bind(new TextDecoder)
const server = uWS.App()
.ws('/*', {
  // compression: uWS.SHARED_COMPRESSOR,
  // maxPayloadLength: 16 * 1024 * 1024,
  // idleTimeout: 12,
  upgrade: (res, req, context) => {
    const url = req.getUrl()
    console.log('An Http connection wants to become WebSocket, URL:', url)
    console.log(req.getHeader('sec-websocket-protocol'))

    res.upgrade(
      { url },
      /* Spell these correctly */
      req.getHeader('sec-websocket-key'),
      req.getHeader('sec-websocket-protocol'),
      req.getHeader('sec-websocket-extensions'),
      context,
    )
  },
  open: (ws) => {
    clients.add(ws)
    ws.id = Math.random().toString(36).slice(2, 6).padEnd(4, '0')
    console.log(ws.id, 'WebSocket connected')
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
.get('/api/auth/discord')
.get('/*', process.env.NODE_ENV === 'development'
  ? res => res.end(readFileSync('./index.html'))
  : res => res.end(index))
.listen(port, err => console.log(err, { port }))
