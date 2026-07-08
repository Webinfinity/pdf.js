#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import https from 'https';
import { createWriteStream } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import os from 'os';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  gray: '\x1b[90m',
};

function writeSuccess(msg) {
  console.log(`${colors.green}✓ ${msg}${colors.reset}`);
}

function writeInfo(msg) {
  console.log(`${colors.cyan}${msg}${colors.reset}`);
}

function writeDetail(msg) {
  console.log(`${colors.gray}  → ${msg}${colors.reset}`);
}

function writeError(msg) {
  console.error(`${colors.red}ERROR: ${msg}${colors.reset}`);
  process.exit(1);
}

function promptUser(question) {
  return new Promise((resolve) => {
    process.stdout.write(`${colors.yellow}${question}${colors.reset} `);
    process.stdin.once('data', (data) => {
      resolve(data.toString().trim().toLowerCase() === 'y');
    });
  });
}

function downloadFile(url, outputPath) {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(outputPath);
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        file.destroy();
        downloadFile(response.headers.location, outputPath).then(resolve).catch(reject);
        return;
      }
      if (response.statusCode !== 200) {
        file.destroy();
        reject(new Error(`Failed to download: HTTP ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close(() => {
          setTimeout(resolve, 100);
        });
      });
      file.on('error', reject);
    }).on('error', reject);
  });
}

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function runScript() {
  // Parse arguments
  const args = process.argv.slice(2);
  let name, ticketId, version;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '-n' || args[i] === '--name') {
      name = args[++i];
    } else if (args[i] === '-t' || args[i] === '--ticket') {
      ticketId = args[++i];
    } else if (args[i] === '-v' || args[i] === '--version') {
      version = args[++i];
    } else if (args[i] === '-h' || args[i] === '--help') {
      console.log(`
Usage: node update-pdfjs-version.js [options]

Options:
  -n, --name <name>           Developer name (part of the branch name)
  -t, --ticket <ticket_id>    Ticket ID (format: em360-{numeric-id})
  -v, --version <version>     PDF.js version to upgrade to (e.g., 4.0.0)
  -h, --help                  Show this help message

Example:
  node update-pdfjs-version.js -n andrei -t em360-6878 -v 4.0.0
      `);
      process.exit(0);
    }
  }

  // Validate required parameters
  if (!name || !ticketId || !version) {
    writeError('Missing required parameters. Use -h or --help for usage information.');
  }

  // Validate ticket ID format
  if (!/^em360-\d+$/.test(ticketId)) {
    writeError(`Invalid ticket ID format. Expected 'em360-{numeric-id}', got '${ticketId}'`);
  }

  // Set variables
  const branchName = `feature/${name}/${ticketId}-pdfjs-${version}`;
  const downloadUrl = `https://github.com/mozilla/pdf.js/releases/download/v${version}/pdfjs-${version}-dist.zip`;
  const packageJsonUrl = `https://raw.githubusercontent.com/mozilla/pdf.js/v${version}/package.json`;
  const packageLockJsonUrl = `https://raw.githubusercontent.com/mozilla/pdf.js/v${version}/package-lock.json`;
  const pdfjsConfigUrl = `https://raw.githubusercontent.com/mozilla/pdf.js/v${version}/pdfjs.config`;

  // Get the repository root (parent of scripts directory)
  const repoDir = path.resolve(__dirname, '..');

  try {
    process.chdir(repoDir);

    // Show summary
    console.log('');
    console.log(`${colors.yellow}═══════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.yellow}  PDF.js Update Summary${colors.reset}`);
    console.log(`${colors.yellow}═══════════════════════════════════════════${colors.reset}`);
    console.log(`Repository:     ${repoDir}`);
    console.log(`Developer:      ${name}`);
    console.log(`Ticket:         ${ticketId}`);
    console.log(`PDF.js Version: ${version}`);
    console.log(`Branch:         ${branchName}`);
    console.log(`${colors.yellow}═══════════════════════════════════════════${colors.reset}`);
    console.log('');

    // Ask for confirmation
    process.stdin.setRawMode(true);
    const confirmed = await promptUser('Continue? (y/n)');
    process.stdin.setRawMode(false);

    if (!confirmed) {
      console.log('Operation cancelled.');
      process.exit(0);
    }
    console.log('');

    // Check if branch already exists
    let branchExists = false;
    try {
      execSync(`git rev-parse --verify ${branchName}`, { stdio: 'pipe' });
      branchExists = true;
    } catch {
      branchExists = false;
    }

    if (branchExists) {
      writeInfo(`Step 1: Checking out existing feature branch`);
      writeDetail(`git checkout ${branchName}`);
      execSync(`git checkout ${branchName}`, { stdio: 'inherit' });
      writeSuccess('Switched to existing branch');
    } else {
      writeInfo('Step 1: Updating local repository...');
      writeDetail(`git pull origin master`);
      execSync('git pull origin master', { stdio: 'inherit' });
      writeSuccess('Repository updated');

      writeInfo('Step 2: Checking out master branch...');
      writeDetail(`git checkout master`);
      execSync('git checkout master', { stdio: 'inherit' });
      writeSuccess('Switched to master');

      writeInfo(`Step 3: Creating feature branch`);
      writeDetail(`git checkout -b ${branchName}`);
      execSync(`git checkout -b ${branchName}`, { stdio: 'inherit' });
      writeSuccess('Feature branch created');
    }

    let step = branchExists ? 2 : 4;

    writeInfo(`Step ${step}: Downloading pdf.js v${version}...`);
    const zipFilePath = path.join(repoDir, `pdfjs-${version}-dist.zip`);
    if (fs.existsSync(zipFilePath)) {
      writeDetail(`Archive already exists at ${zipFilePath}`);
      writeSuccess('Skipped download (file already exists)');
    } else {
      writeDetail(`Source: ${downloadUrl}`);
      await downloadFile(downloadUrl, zipFilePath);
      writeSuccess('Downloaded pdf.js release');
    }
    step++;

    writeInfo(`Step ${step}: Clearing dist folder...`);
    const distPath = path.join(repoDir, 'dist');
    writeDetail(`Removing: ${distPath}`);
    if (fs.existsSync(distPath)) {
      fs.rmSync(distPath, { recursive: true, force: true });
    }
    fs.mkdirSync(distPath, { recursive: true });
    writeSuccess('Dist folder cleared');
    step++;

    writeInfo(`Step ${step}: Extracting pdf.js archive...`);
    writeDetail(`Destination: ${distPath}`);
    try {
      const platform = process.platform;
      if (platform === 'win32') {
        // Use PowerShell on Windows
        execSync(`powershell -Command "Expand-Archive -Path '${zipFilePath}' -DestinationPath '${distPath}' -Force"`, { stdio: 'inherit' });
      } else {
        // Use unzip on Mac/Linux
        execSync(`unzip -q "${zipFilePath}" -d "${distPath}"`, { stdio: 'inherit' });
      }
    } catch {
      writeError('Failed to extract archive.');
    }
    writeSuccess('Archive extracted to dist');
    step++;

    writeInfo(`Step ${step}: Removing archive file...`);
    writeDetail(`Deleting: ${zipFilePath}`);
    if (fs.existsSync(zipFilePath)) {
      fs.unlinkSync(zipFilePath);
      writeSuccess('Archive file removed');
    } else {
      writeDetail('Archive already removed');
      writeSuccess('Skipped (file not found)');
    }
    step++;

    writeInfo(`Step ${step}: Updating package.json...`);
    writeDetail(`Source: ${packageJsonUrl}`);
    const packageJsonPath = path.join(repoDir, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      fs.unlinkSync(packageJsonPath);
      writeDetail('Old package.json deleted');
    }
    const packageJsonContent = await fetchUrl(packageJsonUrl);
    fs.writeFileSync(packageJsonPath, packageJsonContent);
    writeSuccess('package.json downloaded and updated');
    step++;

    writeInfo(`Step ${step}: Updating package-lock.json...`);
    writeDetail(`Source: ${packageLockJsonUrl}`);
    const packageLockJsonPath = path.join(repoDir, 'package-lock.json');
    if (fs.existsSync(packageLockJsonPath)) {
      fs.unlinkSync(packageLockJsonPath);
      writeDetail('Old package-lock.json deleted');
    }
    const packageLockJsonContent = await fetchUrl(packageLockJsonUrl);
    fs.writeFileSync(packageLockJsonPath, packageLockJsonContent);
    writeSuccess('package-lock.json downloaded and updated');
    step++;

    writeInfo(`Step ${step}: Updating pdfjs.config...`);
    writeDetail(`Source: ${pdfjsConfigUrl}`);
    const pdfjsConfigPath = path.join(repoDir, 'pdfjs.config');
    if (fs.existsSync(pdfjsConfigPath)) {
      fs.unlinkSync(pdfjsConfigPath);
      writeDetail('Old pdfjs.config deleted');
    }
    const pdfjsConfigContent = await fetchUrl(pdfjsConfigUrl);
    fs.writeFileSync(pdfjsConfigPath, pdfjsConfigContent);
    writeSuccess('pdfjs.config downloaded and updated');
    step++;

    console.log('');
    console.log(`${colors.green}==========================================`);
    console.log(`✓ PDF.js files updated successfully!`);
    console.log(`==========================================${colors.reset}`);
    console.log(`${colors.yellow}Branch: ${branchName}${colors.reset}`);
    console.log(`${colors.yellow}Version: ${version}${colors.reset}`);
    console.log('');
    console.log(`${colors.cyan}Copy & paste these commands:${colors.reset}`);
    console.log('');
    const commitMessage = `em360-${ticketId} pdf.js upgraded to v${version}`;
    console.log(`git add --all`);
    console.log(`git commit -m "${commitMessage}"`);
    console.log(`git push -u origin ${branchName}`);
    console.log('');
    console.log(`${colors.cyan}Then create PR:${colors.reset}`);
    console.log(`https://github.com/Webinfinity/pdf.js/compare/${branchName}`);
    console.log('');
  } catch (error) {
    writeError(error.message || error);
  }
}

runScript().catch(writeError);
