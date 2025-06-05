const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const fs = require('fs');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files with proper MIME types
app.use('/static', express.static('static'));
app.use('/node_modules', (req, res, next) => {
  if (req.path.endsWith('.js') || req.path.endsWith('.cjs')) {
    res.type('application/javascript');
  }
  next();
}, express.static('node_modules'));

// Routes
app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.get('/code', (req, res) => {
  res.sendFile(__dirname + '/static/code.html');
});

app.post('/code', (req, res) => {
  const code = req.body.code;
  const author = req.body.author;
  fs.writeFileSync(`snippets/${author}.txt`, code);
  res.send('Code saved');
});

app.get('/snippets', (req, res) => {
  const snippets = fs.readdirSync('snippets').map(filename => {
    const stats = fs.statSync(`snippets/${filename}`);
    return {
      name: filename,
      updated: stats.mtime
    };
  });
  res.json(snippets);
});

app.get('/snippets/:snippet', (req, res) => {
  const snippet = req.params.snippet;
  const code = fs.readFileSync(`snippets/${snippet}`, 'utf8');
  res.send(code);
});

app.get('/animation', (req, res) => {
  res.sendFile(__dirname + '/static/show.html');
});


// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
