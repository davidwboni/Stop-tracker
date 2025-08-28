const fs = require('fs');
const path = require('path');

// Create exact path to vulnerable module
const vulnerablePath = path.join(__dirname, 'node_modules', 'react-scripts', 'node_modules', 'resolve-url-loader', 'node_modules', 'postcss');
const securePostcssPath = path.join(__dirname, 'node_modules', 'postcss');

if (fs.existsSync(vulnerablePath) && fs.existsSync(securePostcssPath)) {
  console.log('Forcing direct replacement of vulnerable postcss...');
  // Remove vulnerable version
  fs.rmSync(vulnerablePath, { recursive: true, force: true });
  // Create symlink to secure version
  fs.symlinkSync(securePostcssPath, vulnerablePath, 'junction');
  console.log('Successfully patched postcss vulnerability!');
} else {
  if (!fs.existsSync(vulnerablePath)) {
    console.log('Vulnerable postcss path not found:', vulnerablePath);
  }
  if (!fs.existsSync(securePostcssPath)) {
    console.log('Secure postcss path not found:', securePostcssPath);
  }
}
