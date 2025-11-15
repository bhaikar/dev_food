// Vercel serverless function for Express app
// Handles all /api/* routes
import app from "../backend/server.js";

export default function handler(req, res) {
  // Vercel's rewrite should preserve the original URL in req.url
  // So /api/admin/stats should come through as /api/admin/stats
  // But let's add logging to debug and ensure the path is correct
  
  // Log the request (check Vercel function logs)
  console.log('🔍 API Handler called:', {
    method: req.method,
    url: req.url,
    originalUrl: req.originalUrl,
    path: req.path,
    query: req.query
  });
  
  // Vercel rewrites preserve the original URL, so req.url should already be correct
  // But if for some reason it's not, we'll handle it
  if (req.url && !req.url.startsWith('/api') && req.url !== '/') {
    // This shouldn't happen with Vercel rewrites, but just in case
    console.warn('⚠️ URL does not start with /api, prepending:', req.url);
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }
  
  // Pass to Express app - it should handle all the routing
  try {
    return app(req, res);
  } catch (error) {
    console.error('❌ Error in API handler:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
}
