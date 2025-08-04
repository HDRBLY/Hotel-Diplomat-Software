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
VITE_API_BASE_URL=https://your-app.railway.app/api
VITE_SOCKET_URL=https://your-app.railway.app
NODE_ENV=production
PORT=3001
```

### 3. Configure Build Settings

1. Go to "Settings" tab
2. Set the following:
   - **Root Directory**: `/` (leave empty for root)
   - **Build Command**: `npm run build`
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
    "buildCommand": "npm run build"
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
cmds = ["npm install"]

[phases.build]
cmds = ["npm run build"]

[start]
cmd = "npm start"
```

## Troubleshooting

### Common Issues

1. **TypeScript Compilation Errors**
   - Ensure all TypeScript files are properly typed
   - Check for missing dependencies
   - Verify tsconfig.json configuration

2. **Build Failures**
   - Check Railway logs for specific error messages
   - Ensure all dependencies are in package.json
   - Verify Node.js version compatibility

3. **Runtime Errors**
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
| `NODE_ENV` | Node.js environment | `production` |
| `PORT` | Server port | `3001` |

## Security Considerations

1. **Environment Variables**: Never commit sensitive data to Git
2. **CORS**: Configure CORS properly for production
3. **HTTPS**: Railway provides SSL certificates automatically
4. **Rate Limiting**: Consider implementing rate limiting for production

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