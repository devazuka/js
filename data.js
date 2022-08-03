import { defineEntity, db } from './atoms.js'

export const User = defineEntity('user', {
  // discord user info
  id: String,
  login: String,

  // discord oauth
  token: String,
  expireAt: Date,
  refresh: String,

  // current level
  level: Number,
})
