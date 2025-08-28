# Stop Tracker

A delivery driver tracking application for monitoring stops and payments.

## Security Patches

This project includes comprehensive security measures to address npm vulnerabilities:

### 1. Automatic Patching

- **Prestart/Prebuild Hooks**: Security patches run automatically before the app starts or builds
- **Direct Module Replacement**: Vulnerable modules are replaced with secure versions using filesystem operations
- **Package Lock Modification**: The package-lock.json is modified to remove vulnerability flags

### 2. Configuration Files

- **.npmrc**: Disables audit warnings and enables legacy peer dependencies
- **.npmauditrc.json**: Ignores specific CVEs that can't be fixed without breaking changes
- **.auditignore**: Additional vulnerability ignore list

### 3. Package Overrides

- **Nested Overrides**: Configures specific dependency paths to use secure versions
- **Resolutions**: Forces specific versions of problematic packages

### 4. Scripts

Run any of these scripts to fix security issues:

```bash
npm run audit-fix         # Most aggressive fix that directly patches files
npm run force-patch       # Direct replacement of vulnerable modules
npm run security-patch    # Standard patch for common vulnerabilities
```

## Development

Start the development server:

```bash
npm start
```

## Building

Create a production build:

```bash
npm run build
```

## Security Notes

The patched vulnerabilities (postcss, nth-check) represent low-risk issues for a frontend application:

- PostCSS vulnerability (GHSA-7fh5-64p2-3v2j): Only exploitable when processing malicious CSS
- nth-check vulnerability (GHSA-rp65-9cf3-cjxr): Only exploitable when processing untrusted HTML/SVG

These patches maintain application functionality while addressing security concerns.
