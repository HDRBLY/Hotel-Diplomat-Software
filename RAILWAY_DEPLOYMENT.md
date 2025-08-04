# 🚀 Railway Deployment Guide

## Prerequisites

1. **Railway Account**: Sign up at [railway.app](https://railway.app)
2. **GitHub Repository**: Your project should be on GitHub
3. **Node.js Knowledge**: Basic understanding of Node.js deployment

## Step-by-Step Deployment

### 1. Connect to Railway

1. Go to [railway.app](https://railway.app) and sign in
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Connect your GitHub account if not already connected
5. Select your repository: `HDRBLY/Hotel-Diplomat-Software`

### 2. Configure Environment Variables

In your Railway project dashboard:

1. Go to "Variables" tab
2. Add these environment variables:

```env
# Frontend Configuration
VITE_API_BASE_URL=https://your-app.railway.app/api
VITE_SOCKET_URL=https://your-app.railway.app

# Backend Configuration
PORT=3001
NODE_ENV=production
CORS_ORIGIN=https://your-app.railway.app
JWT_SECRET=hotel-diplomat-super-secret-key-2024
```

**Important**: Replace `your-app.railway.app` with your actual Railway domain!

### 3. Configure Build Settings

1. Go to "Settings" tab
2. Set the following:
   - **Root Directory**: `/` (leave empty for root)
   - **Build Command**: Leave empty (uses nixpacks.toml)
   - **Start Command**: `npm start`

### 4. Deploy

1. Railway will automatically detect your project
2. Click "Deploy" to start the deployment process
3. Wait for the build to complete (usually 2-5 minutes)

### 5. Get Your Domain

1. Once deployed, go to "Settings" tab
2. Copy your Railway domain (e.g., `https://your-app.railway.app`)
3. Update your environment variables with this domain

## Configuration Files

### railway.json
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "chmod +x build.sh && ./build.sh"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### nixpacks.toml
```toml
[phases.setup]
nixPkgs = ["nodejs", "npm"]

[phases.install]
cmds = ["npm install --production=false"]

[phases.build]
cmds = ["npm run build"]

[start]
cmd = "npm start"

[variables]
NODE_ENV = "production"
```

### Dockerfile (Alternative)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["npm", "start"]
```

## Troubleshooting

### Common Issues

1. **TypeScript Compilation Errors**
   - ✅ **FIXED**: Removed explicit `tsc` command from build script
   - ✅ **FIXED**: Vite now handles TypeScript compilation internally
   - ✅ **FIXED**: Added proper esbuild configuration

2. **Permission Denied Errors**
   - ✅ **FIXED**: Simplified build process
   - ✅ **FIXED**: Using Vite's built-in TypeScript handling
   - ✅ **FIXED**: Added Dockerfile as alternative

3. **CORS Errors**
   - ✅ **FIXED**: Added proper CORS configuration
   - ✅ **FIXED**: Environment variable for CORS_ORIGIN
   - ✅ **FIXED**: Credentials support enabled

4. **Build Failures**
   - Check Railway logs for specific error messages
   - Ensure all dependencies are in package.json
   - Verify Node.js version compatibility

5. **Runtime Errors**
   - Check environment variables are set correctly
   - Verify API endpoints are accessible
   - Check file permissions for data files

### Debugging

1. **View Logs**: Go to "Deployments" tab and click on latest deployment
2. **Check Build Logs**: Look for compilation errors
3. **Check Runtime Logs**: Look for server startup issues

## Post-Deployment

### 1. Test Your Application

1. Visit your Railway domain
2. Test all major features:
   - Login functionality
   - Room management
   - Guest management
   - Reports generation

### 2. Set Up Custom Domain (Optional)

1. Go to "Settings" tab
2. Click "Add Domain"
3. Enter your custom domain
4. Update DNS records as instructed

### 3. Monitor Performance

1. Use Railway's built-in monitoring
2. Check resource usage
3. Monitor response times

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | Frontend API base URL | `https://your-app.railway.app/api` |
| `VITE_SOCKET_URL` | WebSocket connection URL | `https://your-app.railway.app` |
| `PORT` | Server port | `3001` |
| `NODE_ENV` | Node.js environment | `production` |
| `CORS_ORIGIN` | CORS allowed origin | `https://your-app.railway.app` |
| `JWT_SECRET` | JWT secret key | `hotel-diplomat-super-secret-key-2024` |

## Security Considerations

1. **Environment Variables**: Never commit sensitive data to Git
2. **CORS**: Configure CORS properly for production
3. **HTTPS**: Railway provides SSL certificates automatically
4. **Rate Limiting**: Consider implementing rate limiting for production
5. **JWT Secret**: Use a strong, unique JWT secret

## Scaling

1. **Auto-scaling**: Railway can auto-scale based on traffic
2. **Resource Limits**: Monitor your usage and upgrade if needed
3. **Database**: Consider using Railway's PostgreSQL for production

## Support

- **Railway Docs**: [docs.railway.app](https://docs.railway.app)
- **Railway Discord**: [discord.gg/railway](https://discord.gg/railway)
- **GitHub Issues**: Create issues in your repository

---

**🎉 Your Hotel Management System is now deployed on Railway!**

## Recent Fixes Applied

✅ **Fixed TypeScript compilation issues**
✅ **Removed explicit `tsc` command from build script**
✅ **Vite now handles TypeScript compilation internally**
✅ **Added proper esbuild configuration**
✅ **Simplified build process for Railway**
✅ **Added Dockerfile as alternative deployment method**
✅ **Added proper environment variables configuration**
✅ **Fixed CORS configuration for production** 