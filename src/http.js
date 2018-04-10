import cors from 'cors'
import express from 'express'
import logger from 'winston'

import { config as bskConfig, resolveZoneFileToProfile, validateProofs } from 'blockstack'

const HEADERS = { 'Content-Type': 'application/json' }

function jsonError(res, status = 409, message = 'Failed to fetch profile') {
  res.writeHead(status, HEADERS)
  res.write(JSON.stringify(
    { status: false,
      message }))
  res.end()
}

export function makeHTTPServer(config) {
  const app = express()

  app.use(cors())
  app.get('/v1/users/:user', (req, res) => {
    let userToFetch = req.params.user
    if (!userToFetch) {
      return jsonError({statusCode: 404, message: 'Must supply a username'})
    }
    if (userToFetch.indexOf('.') === -1) {
      userToFetch += '.id'
    }

    let ownerAddress
    let publicKey
    let zoneFile
    let verifications
    let profile

    return bskConfig.network.getNameInfo(userToFetch)
      .then(nameInfo => {
        if (nameInfo.zonefile && nameInfo.address) {
          zoneFile = nameInfo.zonefile
          ownerAddress = nameInfo.address
          return resolveZoneFileToProfile(nameInfo.zonefile,
                                          nameInfo.address)
        } else {
          throw new Error('No zonefile found for name.')
        }
      })
      .then(profileResp => {
        profile = profileResp
      })
      .then(() => {
        if (profile) {
          return validateProofs(profile, ownerAddress, userToFetch)
        } else {
          throw new Error('Failure in fetching profile')
        }
      })
      .then(verificationResp => {
        verifications = verificationResp
      })
      .then(() => {
        const userInfo = {
          owner_address: ownerAddress,
          zone_file: zoneFile,
          profile,
          public_key: publicKey,
          verifications
        }
        const jsonResponse = {}
        jsonResponse[userToFetch] = userInfo

        res.writeHead(200, HEADERS)
        res.write(JSON.stringify(jsonResponse))
        res.end()
      })
      .catch((err) => {
        if (!err) {
          return jsonError(res)
        }
        if (err.message === 'Name not found') {
          return jsonError(res, 404, 'Name not found')
        }
        if (err instanceof SyntaxError) {
          return jsonError(res, 400, 'Profile not found, or not JSON')
        }
        if (err.message) { // catch all
          return jsonError(res, 400, err.message)
        }
      })
  })

  return Promise.resolve(app)
}
