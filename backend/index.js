const express = require('express');
const path = require('path');
const app = express();
const port = 3000;

// Serve all static files (HTML, CSS, JS, etc.)
app.use(express.static(__dirname));

// Default route → index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
