import { STATUS_CODES } from 'node:http'
export const toBuf = utf8 => new Uint8Array(Buffer.from(utf8))
const headers = {}

const toHeader = ([k, v]) => [headers[k] || (headers[k] = toBuf(k)), v]

const statuses = Object.fromEntries(
  Object.entries(STATUS_CODES).map(([k, v]) => [k, toBuf(`${k} ${v}`)])
)

const EMPTY = new Uint8Array()
export class R {
  constructor(body, { status, headers }) {
    this.body = body || EMPTY
    this.status = statuses[status || (body ? 200 : 204)]
    this.headers = headers ? Object.entries(headers).map(toHeader) : EMPTY
  }
}
