import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

router.get('/', requireAuth, async (req, res) => {
  try {
    const items = await prisma.cartItem.findMany({
      where: { userId: req.user.id },
      include: { product: true }
    })
    const total = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0)
    res.json({ items, total })
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/cart
router.post('/', requireAuth, async (req, res) => {
  const { productId, quantity = 1 } = req.body
  if (!productId) return res.status(400).json({ error: 'productId is required' })

  try {
    const product = await prisma.product.findUnique({ where: { id: productId } })
    if (!product) return res.status(404).json({ error: 'Product not found' })
    if (product.stock < quantity) return res.status(400).json({ error: 'Not enough stock' })

    const item = await prisma.cartItem.upsert({
      where: { userId_productId: { userId: req.user.id, productId } },
      update: { quantity: { increment: quantity } },
      create: { userId: req.user.id, productId, quantity },
      include: { product: true }
    })
    res.json(item)
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

// PATCH /api/cart/:id 
router.patch('/:id', requireAuth, async (req, res) => {
  const { quantity } = req.body
  if (!quantity || quantity < 1)
    return res.status(400).json({ error: 'Quantity must be at least 1' })

  try {
    const item = await prisma.cartItem.findUnique({ where: { id: req.params.id } })
    if (!item || item.userId !== req.user.id)
      return res.status(404).json({ error: 'Cart item not found' })

    const updated = await prisma.cartItem.update({
      where: { id: req.params.id },
      data: { quantity },
      include: { product: true }
    })
    res.json(updated)
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

// DELETE /api/cart/:id 
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const item = await prisma.cartItem.findUnique({ where: { id: req.params.id } })
    if (!item || item.userId !== req.user.id)
      return res.status(404).json({ error: 'Cart item not found' })

    await prisma.cartItem.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
