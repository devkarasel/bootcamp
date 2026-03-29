import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../lib/prisma.js'

const router = Router()

router.post('/signup', async (req, res) => {
  const { name, email, password } = req.body

  if (!name || !email || !password)
    return res.status(400).json({ error: 'All fields are required' })
  if (password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters' })

  try {
    const hashed = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: { name, email: email.toLowerCase().trim(), password: hashed },
      select: { id: true, name: true, email: true, role: true }
    })
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )
    res.status(201).json({ token, user })
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(400).json({ error: 'Email already registered' })
    }
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/login', async (req, res) => {
  const { email, password } = req.body

  if (!email || !password)
    return res.status(400).json({ error: 'Email and password are required' })

  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    })
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(401).json({ error: 'Invalid email or password' })

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    })
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

router.get('/me', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Not authenticated' })
  try {
    const { id } = jwt.verify(token, process.env.JWT_SECRET)
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true }
    })
    res.json(user)
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
})

export default router
