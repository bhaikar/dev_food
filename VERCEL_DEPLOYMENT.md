# Vercel Deployment Guide

## Environment Variables

Make sure to set the following environment variables in your Vercel project settings:

1. **MONGODB_URI** - Your MongoDB connection string
   - Format: `mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority`
   - Or: `mongodb://username:password@host:port/database`

## Steps to Deploy

1. **Set Environment Variables in Vercel:**
   - Go to your Vercel project settings
   - Navigate to "Environment Variables"
   - Add `MONGODB_URI` with your MongoDB connection string
   - Make sure it's set for Production, Preview, and Development

2. **Deploy to Vercel:**
   ```bash
   vercel --prod
   ```
   Or push to your connected Git repository.

3. **Verify Deployment:**
   - Check that your API is accessible at `https://your-domain.vercel.app/api/health`
   - The frontend should automatically use `/api` for API calls when not on localhost

## Important Notes

- The backend is configured as a serverless function
- MongoDB connection is optimized for serverless (connects on first request)
- CORS is configured to allow all origins
- Static files (HTML, CSS, JS) are served by Vercel automatically
- API routes are handled by the Express server in `backend/server.js`

## Troubleshooting

### Backend not working on Vercel:
1. Check that `MONGODB_URI` is set in Vercel environment variables
2. Check Vercel function logs for errors
3. Verify that `vercel.json` is correctly configured
4. Ensure `backend/server.js` exports the app as default

### CORS issues:
- The server is configured to allow all origins
- If you still have issues, check the browser console for specific errors

### MongoDB connection issues:
- Verify your MongoDB connection string is correct
- Check that your MongoDB Atlas IP whitelist includes Vercel's IP ranges (or use 0.0.0.0/0 for development)
- Check Vercel function logs for connection errors

