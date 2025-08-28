const fs = require('fs');
const path = require('path');

// Create a patch for the vulnerabilities
try {
  // Patch nth-check in react-scripts
  const reactScriptsNthCheckPath = path.join(__dirname, 'node_modules', 'react-scripts', 'node_modules', 'nth-check');
  if (fs.existsSync(reactScriptsNthCheckPath)) {
    console.log('Patching nth-check in react-scripts...');
    
    // Delete the vulnerable version and replace with our secure version
    const secureNthCheckPath = path.join(__dirname, 'node_modules', 'nth-check');
    if (fs.existsSync(secureNthCheckPath)) {
      fs.rmSync(reactScriptsNthCheckPath, { recursive: true, force: true });
      
      // Copy the contents instead of creating a symlink
      fs.mkdirSync(reactScriptsNthCheckPath, { recursive: true });
      fs.readdirSync(secureNthCheckPath).forEach(file => {
        const sourcePath = path.join(secureNthCheckPath, file);
        const destPath = path.join(reactScriptsNthCheckPath, file);
        if (fs.statSync(sourcePath).isFile()) {
          fs.copyFileSync(sourcePath, destPath);
        } else {
          fs.cpSync(sourcePath, destPath, { recursive: true });
        }
      });
      
      console.log('Successfully patched nth-check vulnerability in react-scripts!');
    } else {
      console.log('Secure nth-check not found. Please install it first with: npm install nth-check@latest');
    }
  } else {
    console.log('Vulnerable nth-check not found in react-scripts. No patch needed.');
  }

  // Patch postcss in react-scripts/resolve-url-loader
  const resolveUrlLoaderPostcssPath = path.join(__dirname, 'node_modules', 'react-scripts', 'node_modules', 'resolve-url-loader', 'node_modules', 'postcss');
  if (fs.existsSync(resolveUrlLoaderPostcssPath)) {
    console.log('Patching postcss in react-scripts/resolve-url-loader...');
    
    // Delete the vulnerable version and replace with our secure version
    const securePostcssPath = path.join(__dirname, 'node_modules', 'postcss');
    if (fs.existsSync(securePostcssPath)) {
      fs.rmSync(resolveUrlLoaderPostcssPath, { recursive: true, force: true });
      
      // Copy the contents instead of creating a symlink
      fs.mkdirSync(resolveUrlLoaderPostcssPath, { recursive: true });
      fs.readdirSync(securePostcssPath).forEach(file => {
        const sourcePath = path.join(securePostcssPath, file);
        const destPath = path.join(resolveUrlLoaderPostcssPath, file);
        if (fs.statSync(sourcePath).isFile()) {
          fs.copyFileSync(sourcePath, destPath);
        } else {
          fs.cpSync(sourcePath, destPath, { recursive: true });
        }
      });
      
      console.log('Successfully patched postcss vulnerability in react-scripts/resolve-url-loader!');
    } else {
      console.log('Secure postcss not found. Please install it first with: npm install postcss@latest');
    }
  } else {
    console.log('Vulnerable postcss not found in react-scripts/resolve-url-loader. No patch needed.');
  }

  // Patch css-select in react-scripts
  const reactScriptsCssSelectPath = path.join(__dirname, 'node_modules', 'react-scripts', 'node_modules', 'css-select');
  if (fs.existsSync(reactScriptsCssSelectPath)) {
    console.log('Patching css-select in react-scripts...');
    
    // Delete the vulnerable version and replace with our secure version
    const secureCssSelectPath = path.join(__dirname, 'node_modules', 'css-select');
    if (fs.existsSync(secureCssSelectPath)) {
      fs.rmSync(reactScriptsCssSelectPath, { recursive: true, force: true });
      
      // Copy the contents instead of creating a symlink
      fs.mkdirSync(reactScriptsCssSelectPath, { recursive: true });
      fs.readdirSync(secureCssSelectPath).forEach(file => {
        const sourcePath = path.join(secureCssSelectPath, file);
        const destPath = path.join(reactScriptsCssSelectPath, file);
        if (fs.statSync(sourcePath).isFile()) {
          fs.copyFileSync(sourcePath, destPath);
        } else {
          fs.cpSync(sourcePath, destPath, { recursive: true });
        }
      });
      
      console.log('Successfully patched css-select vulnerability in react-scripts!');
    } else {
      console.log('Secure css-select not found. Please install it first with: npm install css-select@latest');
    }
  } else {
    console.log('Vulnerable css-select not found in react-scripts. No patch needed.');
  }

  // Patch svgo in react-scripts
  const reactScriptsSvgoPath = path.join(__dirname, 'node_modules', 'react-scripts', 'node_modules', 'svgo');
  if (fs.existsSync(reactScriptsSvgoPath)) {
    console.log('Patching svgo in react-scripts...');
    
    // Delete the vulnerable version and replace with our secure version
    const secureSvgoPath = path.join(__dirname, 'node_modules', 'svgo');
    if (fs.existsSync(secureSvgoPath)) {
      fs.rmSync(reactScriptsSvgoPath, { recursive: true, force: true });
      
      // Copy the contents instead of creating a symlink
      fs.mkdirSync(reactScriptsSvgoPath, { recursive: true });
      fs.readdirSync(secureSvgoPath).forEach(file => {
        const sourcePath = path.join(secureSvgoPath, file);
        const destPath = path.join(reactScriptsSvgoPath, file);
        if (fs.statSync(sourcePath).isFile()) {
          fs.copyFileSync(sourcePath, destPath);
        } else {
          fs.cpSync(sourcePath, destPath, { recursive: true });
        }
      });
      
      console.log('Successfully patched svgo vulnerability in react-scripts!');
    } else {
      console.log('Secure svgo not found. Please install it first with: npm install svgo@latest');
    }
  } else {
    console.log('Vulnerable svgo not found in react-scripts. No patch needed.');
  }

  console.log('Patch process completed.');
} catch (error) {
  console.error('Error while applying security patches:', error);
}
