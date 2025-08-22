const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const fs = require('fs');
const sendmail = require('sendmail')();
const prettier = require('prettier');

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
  const sampleCodesDir = __dirname + '/static/sample-codes';
  let filenames = [];
  try {
    filenames = fs.readdirSync(sampleCodesDir)
      .filter(f => f.endsWith('.js'))
      .map(f => f.replace(/\.js$/, ''));
  } catch (e) {
    // If the directory doesn't exist or is empty, just leave filenames empty
  }
  const startHtml = fs.readFileSync(__dirname + '/static/start.html', 'utf8');
  // Insert the filenames as a JS array in a <script> tag before </body>
  const inject = `<script>window.sampleStages = ${JSON.stringify(filenames)};</script>`;
  const resultHtml = startHtml.replace('</body>', `${inject}\n</body>`);
  res.send(resultHtml);
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

// Route to send email with code
app.post('/send-email', async (req, res) => {
  const { email, code, author } = req.body;
  
  if (!email || !code || !author) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Prettify the code content
  let processedCode = code;

  try {
    processedCode = await prettier.format(code, {
      parser: 'babel',
      semi: true,
      singleQuote: true,
      trailingComma: 'es5',
      printWidth: 80,
      tabWidth: 2,
      useTabs: false
    });
    console.log('Code prettified successfully');
  } catch (error) {
    console.log('Could not prettify code, using original formatting:', error.message);
  }

  console.log('Original code length:', code.length);
  console.log('Processed code length:', processedCode.length);

  const mailOptions = {
    from: 'hello@arkadia.hn',
    to: email,
    subject: `Dein Code von ${author} - Canape`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ff0055;">Hallo!</h2>
        <p>Hier ist dein Code von der Canape Session als Anhang!</p>
        <p>Der Code ist als JavaScript-Datei beigefügt und kann direkt verwendet werden. Du kannst ihn z.B. im Online Editor von <a href="https://sketch.paperjs.org">sketch.paperjs.org</a> öffnen und ausführen.</p>
        <p>Viel Spaß beim Weiterentwickeln!</p>
        <p style="color: #888; font-size: 12px;">Gesendet von Canape - Generative Art Coding</p>
      </div>
    `,
    attachments: [
      {
        filename: `${author}_code.txt`,
        content: processedCode,
        contentType: 'text/plain'
      }
    ]
  };

  sendmail(mailOptions, (err, reply) => {
    if (err) {
      console.error('Email error:', err);
      res.status(500).json({ error: 'Failed to send email' });
    } else {
      console.log(`Email sent to: ${email}`);
      console.log(`From: ${author}`);
      console.log(`Code length: ${code.length} characters`);
      console.log('Sendmail reply:', reply);
      res.json({ success: true, message: 'Email sent successfully!' });
    }
  });
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
