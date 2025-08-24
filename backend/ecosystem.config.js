module.exports = {
  apps: [{
    name: 'hotel-diplomat-backend',
    script: 'server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
      JWT_SECRET: 'hotel_diplomat_secret_key_2024_production',
      CORS_ORIGIN: 'https://yourdomain.com' // Replace with your actual domain
    }
  }]
} 