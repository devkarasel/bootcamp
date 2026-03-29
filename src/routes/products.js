import { Router } from 'express'
import multer from 'multer'
import { prisma } from '../lib/prisma.js'
import { cloudinary } from '../lib/cloudinary.js'
import { requireAdmin } from '../middleware/auth.js'

const router = Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, 
  fileFilter(_, file, cb) {
    if (!file.mimetype.startsWith('image/'))
      return cb(new Error('Only image files are allowed'))
    cb(null, true)
  }
})

async function uploadToCloudinary(buffer, folder = 'sickfits') {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (err, result) => {
        if (err) reject(err)
        else resolve(result)
      }
    )
    stream.end(buffer)
  })
}

router.get('/', async (req, res) => {
  try {
    const { search, page = 1, limit = 12 } = req.query
    const skip = (parseInt(page) - 1) * parseInt(limit)
    const where = search
      ? { OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ]}
      : {}
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where, skip, take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.product.count({ where })
    ])
    res.json({ products, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) })
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const product = await prisma.product.findUnique({ where: { id: req.params.id } })
    if (!product) return res.status(404).json({ error: 'Product not found' })
    res.json(product)
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/', requireAdmin, upload.single('image'), async (req, res) => {
  try {
    const { name, description, price, stock } = req.body
    if (!name || !description || !price)
      return res.status(400).json({ error: 'name, description, and price are required' })

    let imageUrl = null
    let imagePublicId = null

    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer)
      imageUrl = result.secure_url
      imagePublicId = result.public_id
    }

    const product = await prisma.product.create({
      data: {
        name,
        description,
        price: Math.round(parseFloat(price) * 100),
        stock: parseInt(stock) || 0,
        imageUrl,
        imagePublicId
      }
    })
    res.status(201).json(product)
  } catch (err) {
    res.status(500).json({ error: err.message || 'Server error' })
  }
})

router.patch('/:id', requireAdmin, upload.single('image'), async (req, res) => {
  try {
    const { name, description, price, stock } = req.body
    const existing = await prisma.product.findUnique({ where: { id: req.params.id } })
    if (!existing) return res.status(404).json({ error: 'Product not found' })

    const data = {}
    if (name) data.name = name
    if (description) data.description = description
    if (price) data.price = Math.round(parseFloat(price) * 100)
    if (stock !== undefined) data.stock = parseInt(stock)

    if (req.file) {
      if (existing.imagePublicId) {
        await cloudinary.uploader.destroy(existing.imagePublicId)
      }
      const result = await uploadToCloudinary(req.file.buffer)
      data.imageUrl = result.secure_url
      data.imagePublicId = result.public_id
    }

    const product = await prisma.product.update({
      where: { id: req.params.id },
      data
    })
    res.json(product)
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const product = await prisma.product.findUnique({ where: { id: req.params.id } })
    if (!product) return res.status(404).json({ error: 'Product not found' })

    if (product.imagePublicId) {
      await cloudinary.uploader.destroy(product.imagePublicId)
    }

    await prisma.product.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
