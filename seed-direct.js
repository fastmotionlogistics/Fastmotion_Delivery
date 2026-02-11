const { MongoClient, ObjectId } = require('mongodb');

async function main() {
  // Connection URL
  const url = 'mongodb://localhost:27017';
  const client = new MongoClient(url);

  try {
    // Connect to the MongoDB server
    await client.connect();
    console.log('Connected successfully to MongoDB server');

    // Database and collection
    const db = client.db('breadboy');
    const categoriesCollection = db.collection('categories');

    // Check if categories already exist
    const existingCount = await categoriesCollection.countDocuments();
    console.log(`Found ${existingCount} existing categories`);

    if (existingCount > 0) {
      console.log('Categories already exist, skipping seeding');
      return;
    }

    // Categories data
    const categories = [
      // Bread categories
      {
        _id: new ObjectId(),
        name: 'Loaf Bread',
        description: 'Various types of loaf bread',
        imageUrl: 'https://example.com/images/loaf-bread.jpg',
        displayOrder: 1,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new ObjectId(),
        name: 'Buns & Rolls',
        description: 'Soft buns and rolls for sandwiches and burgers',
        imageUrl: 'https://example.com/images/buns-rolls.jpg',
        displayOrder: 2,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new ObjectId(),
        name: 'Flatbreads',
        description: 'Pita, naan, and other flatbreads',
        imageUrl: 'https://example.com/images/flatbreads.jpg',
        displayOrder: 3,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new ObjectId(),
        name: 'Specialty Breads',
        description: 'Artisanal and specialty breads',
        imageUrl: 'https://example.com/images/specialty-breads.jpg',
        displayOrder: 4,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },

      // Pastry categories
      {
        _id: new ObjectId(),
        name: 'Pastries',
        description: 'Sweet and savory pastries',
        imageUrl: 'https://example.com/images/pastries.jpg',
        displayOrder: 5,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new ObjectId(),
        name: 'Cakes',
        description: 'Celebration and everyday cakes',
        imageUrl: 'https://example.com/images/cakes.jpg',
        displayOrder: 6,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new ObjectId(),
        name: 'Cookies & Biscuits',
        description: 'Sweet cookies and savory biscuits',
        imageUrl: 'https://example.com/images/cookies.jpg',
        displayOrder: 7,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new ObjectId(),
        name: 'Donuts',
        description: 'Sweet fried dough confections',
        imageUrl: 'https://example.com/images/donuts.jpg',
        displayOrder: 8,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    // Store references to main categories
    const loafBreadId = categories[0]._id;

    // Add subcategories
    const subcategories = [
      {
        _id: new ObjectId(),
        name: 'White Bread',
        description: 'Traditional white bread loaves',
        imageUrl: 'https://example.com/images/white-bread.jpg',
        displayOrder: 1,
        parentCategoryId: loafBreadId.toString(),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new ObjectId(),
        name: 'Whole Wheat Bread',
        description: 'Nutritious whole wheat bread loaves',
        imageUrl: 'https://example.com/images/whole-wheat.jpg',
        displayOrder: 2,
        parentCategoryId: loafBreadId.toString(),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new ObjectId(),
        name: 'Multigrain Bread',
        description: 'Bread with various grains and seeds',
        imageUrl: 'https://example.com/images/multigrain.jpg',
        displayOrder: 3,
        parentCategoryId: loafBreadId.toString(),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    // Insert all categories
    const allCategories = [...categories, ...subcategories];
    const result = await categoriesCollection.insertMany(allCategories);

    console.log(`${result.insertedCount} categories inserted successfully`);
  } catch (err) {
    console.error('Failed to seed categories:', err);
  } finally {
    // Close the connection
    await client.close();
    console.log('Connection closed');
  }
}

main().catch(console.error);



