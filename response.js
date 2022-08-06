import { STATUS_CODES } from 'node:http'
export const toBuf = utf8 => new Uint8Array(Buffer.from(utf8))
const headers = {}

const toHeader = ([k, v]) => [headers[k] || (headers[k] = toBuf(k)), v]

const statuses = Object.fromEntries(
  Object.entries(STATUS_CODES).map(([k, v]) => [k, toBuf(`${k} ${v}`)])
)

export class R {
  constructor(body, { status, headers }) {
    this.body = body
    this.status = statuses[status]
    this.headers = Object.entries(headers).map(toHeader)
  }
}
