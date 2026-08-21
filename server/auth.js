import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

const JWT_SECRET = process.env.JWT_SECRET || 'quiz_hub_secret_key_2025_safe'

export async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10)
  return bcrypt.hash(password, salt)
}

export async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash)
}

export function generateToken(user) {
  return jwt.sign(
    { userId: user.userId, email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: '7d' }
  )
}

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' })
    }
    req.user = decoded
    next()
  })
}
