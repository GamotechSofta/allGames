import axios from 'axios'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

const GAP_BASE_URL = () => process.env.GAP_BASE_URL || ''
const GAP_PRIVATE_KEY_PATH = () => process.env.GAP_PRIVATE_KEY_PATH || ''
const GAP_PUBLIC_KEY_PATH = () => process.env.GAP_PUBLIC_KEY_PATH || ''
const OPERATOR_ID = () => process.env.OPERATOR_ID || ''

function resolvePemPath(filePath) {
  if (!filePath) return ''
  return path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath)
}

function getPrivateKey() {
  const privatePath = resolvePemPath(GAP_PRIVATE_KEY_PATH())
  if (!privatePath || !fs.existsSync(privatePath)) {
    throw new Error('GAP private key file not found. Check GAP_PRIVATE_KEY_PATH')
  }
  return fs.readFileSync(privatePath, 'utf8')
}

function getDefaultPublicKey() {
  const publicPath = resolvePemPath(GAP_PUBLIC_KEY_PATH())
  if (!publicPath || !fs.existsSync(publicPath)) {
    throw new Error('GAP public key file not found. Check GAP_PUBLIC_KEY_PATH')
  }
  return fs.readFileSync(publicPath, 'utf8')
}

export function encryptWithPublicKey(data, publicKey) {
  const plainText = typeof data === 'string' ? data : JSON.stringify(data)
  const encrypted = crypto.publicEncrypt(
    {
      key: publicKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
    },
    Buffer.from(plainText, 'utf8'),
  )
  return encrypted.toString('base64')
}

export function decryptWithPrivateKey(data) {
  const privateKey = getPrivateKey()
  const decrypted = crypto.privateDecrypt(
    {
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
    },
    Buffer.from(data, 'base64'),
  )
  return decrypted.toString('utf8')
}

/**
 * Encrypted GAP HTTP request.
 * Wrap → encrypt with GAP public key → POST { data } → decrypt response.
 */
export async function gapRequest(endpoint, payload, gapPublicKey) {
  if (!GAP_BASE_URL()) {
    // Optional: catalog games launch from admin Launch URL only
    throw new Error('GAP_BASE_URL is not configured (optional; wallet notify skipped)')
  }

  const publicKey = gapPublicKey || getDefaultPublicKey()
  const body = {
    operatorId: OPERATOR_ID(),
    timestamp: new Date().toISOString(),
    payload,
  }
  const encryptedData = encryptWithPublicKey(body, publicKey)
  const url = `${GAP_BASE_URL().replace(/\/$/, '')}/${String(endpoint || '').replace(/^\//, '')}`

  console.log('[GAP] Request:', url)

  const response = await axios.post(
    url,
    { data: encryptedData },
    { timeout: 15000, headers: { 'Content-Type': 'application/json' } },
  )

  if (!response?.data) {
    throw new Error('Empty response from GAP')
  }

  if (response.data.data) {
    const decrypted = decryptWithPrivateKey(response.data.data)
    return JSON.parse(decrypted)
  }

  return response.data
}

export const gapConfig = {
  get GAP_BASE_URL() {
    return GAP_BASE_URL()
  },
  get GAP_PRIVATE_KEY_PATH() {
    return GAP_PRIVATE_KEY_PATH()
  },
  get GAP_PUBLIC_KEY_PATH() {
    return GAP_PUBLIC_KEY_PATH()
  },
  get OPERATOR_ID() {
    return OPERATOR_ID()
  },
}
