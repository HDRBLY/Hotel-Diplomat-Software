# Hotel Diplomat Backend - Deployment Guide for Miles Web

## 🚀 Quick Deployment Steps

### 1. Upload Files to Miles Web
- Upload the entire `backend` folder to your Miles Web hosting
- Make sure Node.js is enabled in your hosting control panel

### 2. Install Dependencies
```bash
cd backend
npm install --production
```

### 3. Configure Environment
Update `config.env` with your production settings:
```env
PORT=3001
JWT_SECRET=your_super_secret_production_key
CORS_ORIGIN=https://yourdomain.com
NODE_ENV=production
```

### 4. Start the Server
```bash
npm start
```

### 5. Update Frontend API URL
In your frontend, update the API base URL to point to your domain:
```javascript
// In src/services/api.ts
const API_BASE_URL = 'https://yourdomain.com/api'
```

## 📁 File Structure for Upload
```
backend/
├── server.js
├── package.json
├── config.env
├── ecosystem.config.js
├── data/ (will be created automatically)
└── node_modules/ (after npm install)
```

## 🔧 Miles Web Specific Configuration

### Node.js Version
- Make sure your hosting supports Node.js 16+ 
- Set Node.js version in your hosting control panel

### Port Configuration
- Most shared hosting uses port 3000 or 3001
- Update PORT in config.env if needed

### Domain Configuration
- Update CORS_ORIGIN in config.env with your actual domain
- Make sure your domain points to the correct directory

## 📊 Monitoring
- Check server logs in your hosting control panel
- Monitor the `/api/health` endpoint
- Data is stored in JSON files in the `data/` directory

## 🔒 Security Notes
- Change JWT_SECRET to a strong random string
- Keep config.env file secure
- Regular backups of the `data/` directory

## 🆘 Troubleshooting
1. **Server not starting**: Check Node.js version and port availability
2. **CORS errors**: Verify CORS_ORIGIN matches your domain
3. **Data not saving**: Check file permissions on `data/` directory
4. **API not responding**: Verify the server is running and accessible

## 📞 Support
For issues with Miles Web hosting, contact their support team. 