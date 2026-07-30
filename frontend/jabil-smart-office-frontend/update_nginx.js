const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, 'dist');
const nginxDir = 'c:/Users/1167023/Desktop/Jabil/nginx/html';
const assetsDir = path.join(nginxDir, 'assets');

// Get all files from dist/assets
const distFiles = fs.readdirSync(path.join(distDir, 'assets'));

// Copy files to nginx
distFiles.forEach(file => {
  const src = path.join(distDir, 'assets', file);
  const dest = path.join(assetsDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log('Copied:', file);
  }
});

// Update index.html
let indexHtml = fs.readFileSync(path.join(distDir, 'index.html'), 'utf8');

// Replace asset paths
indexHtml = indexHtml.replace(/src="\/assets\//g, 'src="/assets/');
indexHtml = indexHtml.replace(/href="\/assets\//g, 'href="/assets/');

fs.writeFileSync(path.join(nginxDir, 'index.html'), indexHtml);
console.log('Updated index.html');
