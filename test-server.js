const express = require('express');
const app = express();
const PORT = 3001;

app.get('/health', (req, res) => {
  console.log('Health check requested');
  res.json({ 
    status: 'OK', 
    message: 'ChangeBot is running',
    timestamp: new Date().toISOString(),
    github_user: 'eduardo-baptista_rappinc'
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

console.log('Starting simple server...');