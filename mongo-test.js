const { MongoClient } = require('mongodb');

async function main() {
  // Connection URL
  const url = 'mongodb://localhost:27017';
  const client = new MongoClient(url);

  try {
    // Connect to the MongoDB server
    await client.connect();
    console.log('Connected successfully to MongoDB server');

    // Get the list of databases
    const adminDb = client.db('admin');
    const dbs = await adminDb.admin().listDatabases();

    console.log('Available databases:');
    dbs.databases.forEach((db) => {
      console.log(`- ${db.name}`);
    });
  } catch (err) {
    console.error('Failed to connect to MongoDB:', err);
  } finally {
    // Close the connection
    await client.close();
    console.log('Connection closed');
  }
}

main().catch(console.error);



