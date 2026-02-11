// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config();

// Then you can add a debug line to verify it's loading
console.log('MongoDB URI loaded:', process.env.MONGODB_URI ? 'Yes' : 'No');

const config = {
  mongodb: {
    url: process.env.MONGODB_URI || 'mongodb://localhost:27017/fastmotion',
    databaseName: 'fastmotion',
    options: {
      useNewUrlParser: true, // removes a deprecation warning when connecting
      useUnifiedTopology: true, // removes a deprecating warning when connecting
      //   connectTimeoutMS: 3600000, // increase connection timeout to 1 hour
      //   socketTimeoutMS: 3600000, // increase socket timeout to 1 hour
    },
  },
  migrationsDir: 'migrations',
  changelogCollectionName: 'changelog',
  lockCollectionName: 'changelog_lock',
  lockTtl: 0,
  migrationFileExtension: '.js',
  useFileHash: false,
  moduleSystem: 'commonjs',
};

module.exports = config;
