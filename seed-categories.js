/**
 * Seed script for Item Categories and Special Handling options.
 *
 * Usage:  node seed-categories.js
 *
 * Requires MONGO_URI env variable or falls back to local default.
 */
const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fastmotion';

const categories = [
  {
    slug: 'documents',
    name: 'Documents',
    emoji: '📄',
    description: 'Letters, contracts, certificates',
    priceMultiplier: 1.0,
    additionalFee: 0,
    priceLabel: null,
    status: 'active',
    sortOrder: 1,
  },
  {
    slug: 'clothes',
    name: 'Clothes',
    emoji: '👕',
    description: 'Clothing and fabric items',
    priceMultiplier: 1.0,
    additionalFee: 0,
    priceLabel: null,
    status: 'active',
    sortOrder: 2,
  },
  {
    slug: 'food',
    name: 'Food Items',
    emoji: '🍔',
    description: 'Prepared meals, groceries',
    priceMultiplier: 1.2,
    additionalFee: 0,
    priceLabel: '+20%',
    status: 'active',
    sortOrder: 3,
  },
  {
    slug: 'electronics',
    name: 'Electronics',
    emoji: '📱',
    description: 'Phones, laptops, gadgets',
    priceMultiplier: 1.5,
    additionalFee: 0,
    priceLabel: '+50%',
    status: 'active',
    sortOrder: 4,
  },
  {
    slug: 'fragile',
    name: 'Fragile Items',
    emoji: '🏺',
    description: 'Glass, ceramics, delicate items',
    priceMultiplier: 1.8,
    additionalFee: 0,
    priceLabel: '+80%',
    status: 'active',
    sortOrder: 5,
  },
  {
    slug: 'other',
    name: 'Other',
    emoji: '📦',
    description: 'General items',
    priceMultiplier: 1.1,
    additionalFee: 0,
    priceLabel: '+10%',
    status: 'active',
    sortOrder: 6,
  },
];

const specialHandling = [
  {
    slug: 'fragile',
    name: 'Fragile',
    description: 'Handle with extra care',
    additionalFee: 300,
    priceMultiplier: 1.0,
    priceLabel: '+₦300',
    bgColor: '#FEE2E2',
    textColor: '#DC2626',
    status: 'active',
    sortOrder: 1,
  },
  {
    slug: 'keep_upright',
    name: 'Keep Upright',
    description: 'Must remain upright during transit',
    additionalFee: 200,
    priceMultiplier: 1.0,
    priceLabel: '+₦200',
    bgColor: '#F3E8FF',
    textColor: '#7C3AED',
    status: 'active',
    sortOrder: 2,
  },
  {
    slug: 'perishable',
    name: 'Perishable',
    description: 'Time-sensitive, may spoil',
    additionalFee: 500,
    priceMultiplier: 1.0,
    priceLabel: '+₦500',
    bgColor: '#DBEAFE',
    textColor: '#2563EB',
    status: 'active',
    sortOrder: 3,
  },
  {
    slug: 'do_not_stack',
    name: 'Do Not Stack',
    description: 'Nothing should be placed on top',
    additionalFee: 150,
    priceMultiplier: 1.0,
    priceLabel: '+₦150',
    bgColor: '#FFF7ED',
    textColor: '#EA580C',
    status: 'active',
    sortOrder: 4,
  },
];

async function seed() {
  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    const db = client.db('fastmotion');

    // Seed categories (upsert by slug)
    const catCol = db.collection('item_categories');
    for (const cat of categories) {
      await catCol.updateOne(
        { slug: cat.slug },
        { $set: { ...cat, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
        { upsert: true },
      );
    }
    console.log(`✅ Seeded ${categories.length} item categories`);

    // Seed special handling (upsert by slug)
    const shCol = db.collection('special_handling');
    for (const sh of specialHandling) {
      await shCol.updateOne(
        { slug: sh.slug },
        { $set: { ...sh, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
        { upsert: true },
      );
    }
    console.log(`✅ Seeded ${specialHandling.length} special handling options`);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  } finally {
    await client.close();
  }
}

seed();
