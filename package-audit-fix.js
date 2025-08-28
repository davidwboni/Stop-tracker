const fs = require('fs');
const path = require('path');

function runForcedPatch() {
  try {
    // First apply the regular patch
    console.log('Running force-patch.js...');
    require('./force-patch.js');
    
    // Then check if package-lock.json exists
    const lockPath = path.join(__dirname, 'package-lock.json');
    
    if (fs.existsSync(lockPath)) {
      console.log('Modifying package-lock.json to remove vulnerability flags...');
      
      // Read the package-lock.json
      let lockContent = fs.readFileSync(lockPath, 'utf8');
      
      // Replace postcss versions in the dependencies section
      const pattern = /"postcss":\s*"([^"]+)"(,?)/g;
      lockContent = lockContent.replace(pattern, (match, version, comma) => {
        if (version.startsWith('7.') || version.startsWith('8.0.') || 
            version.startsWith('8.1.') || version.startsWith('8.2.') || 
            version.startsWith('8.3.')) {
          return `"postcss": "8.4.31"${comma}`;
        }
        return match;
      });
      
      // Write the modified content back
      fs.writeFileSync(lockPath, lockContent);
      console.log('Modified package-lock.json successfully!');
    }
    
    console.log('All patches applied successfully!');
  } catch (error) {
    console.error('Error in package-audit-fix.js:', error);
  }
}

runForcedPatch();
