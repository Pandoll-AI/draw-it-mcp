#!/usr/bin/env node

import { spawn } from 'child_process';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Read version from package.json
const packageJsonPath = path.join(projectRoot, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const version = packageJson.version;

// ASCII Art Banner
const banner = `
╭─────────────────────────────────────────────────────────────╮
│  Draw-it-MCP - MCP-Powered Drawing Assistant for AI Coding  │
│                                      v${version.padEnd(6)}                │
│  Features:                                                  │
│  • Beautiful canvas drawing interface                       │ 
│  • Save & load your artwork                                 │
│  • Cursor & Claude Code MCP integration                     │
│  • Dark/Light theme support                                 │
│                                                             │
╰─────────────────────────────────────────────────────────────╯
`;

console.log('\x1b[36m%s\x1b[0m', banner);

// Find available port
async function findAvailablePort(startPort = 3001) {
  return new Promise((resolve) => {
    const server = createServer();
    server.listen(startPort, () => {
      const port = server.address().port;
      server.close(() => {
        resolve(port);
      });
    });
    server.on('error', () => {
      resolve(findAvailablePort(startPort + 1));
    });
  });
}

// Check if this is first run
function isFirstRun() {
  const flagFile = path.join(projectRoot, '.first-run');
  if (!fs.existsSync(flagFile)) {
    fs.writeFileSync(flagFile, Date.now().toString());
    return true;
  }
  return false;
}

// Handle update command
if (process.argv.includes('update')) {
  console.log('🔄 Updating Draw-it-MCP...\n');
  
  const updateProcess = spawn('npm', ['update', '-g', 'draw-it-mcp'], {
    stdio: 'inherit',
    shell: true
  });
  
  updateProcess.on('close', (code) => {
    if (code === 0) {
      console.log('\n✅ Update completed successfully!');
      console.log('🎉 Draw-it-MCP is now up to date.');
    } else {
      console.log('\n❌ Update failed. Trying alternative method...');
      console.log('🔄 Running: npm install -g draw-it-mcp@latest\n');
      
      const installProcess = spawn('npm', ['install', '-g', 'draw-it-mcp@latest'], {
        stdio: 'inherit', 
        shell: true
      });
      
      installProcess.on('close', (installCode) => {
        if (installCode === 0) {
          console.log('\n✅ Installation completed successfully!');
          console.log('🎉 Draw-it-MCP has been updated to the latest version.');
        } else {
          console.log('\n❌ Automatic update failed. Please run manually:');
          console.log('   npm install -g draw-it-mcp@latest');
        }
        process.exit(installCode);
      });
    }
  });
  
  process.exit(0); // Don't proceed to main()
}

// Handle MCP server execution
if (process.argv.includes('mcp:server')) {
  // When called as "draw-it-mcp mcp:server", run the MCP server directly
  const mcpPath = path.resolve(__dirname, '..', 'src', 'mcp', 'drawing-mcp-server.js');
  spawn('node', [mcpPath], { stdio: 'inherit' });
  process.exit(0);
}

// Show MCP configuration for Cursor & Claude Code
function showMCPConfiguration() {
  console.log('\n📋 MCP Configuration for Cursor & Claude Code');
  console.log('='.repeat(50));
  console.log('Copy and paste one of these configurations:\n');
  
  // Get installation paths
  const globalNodeModulesPath = path.dirname(path.dirname(__dirname));
  const mcpServerPath = path.join(projectRoot, 'src', 'mcp', 'drawing-mcp-server.js');
  
  console.log('🔧 Option 1: Using NPX (Recommended)');
  console.log('```json');
  console.log(JSON.stringify({
    mcpServers: {
      "draw-it-mcp": {
        command: "npx",
        args: ["-y", "draw-it-mcp", "mcp:server"]
      }
    }
  }, null, 2));
  console.log('```\n');
  
  console.log('🔧 Option 2: Using absolute path');
  console.log('```json');
  console.log(JSON.stringify({
    mcpServers: {
      "draw-it-mcp": {
        command: "node",
        args: [mcpServerPath]
      }
    }
  }, null, 2));
  console.log('```\n');
  
  console.log('💡 Setup Instructions:');
  console.log('1. Copy one of the JSON configurations above');
  console.log('2. In Cursor: Open Settings → Extensions → MCP Settings');
  console.log('3. In Claude Code: Use command palette → "Claude Code: Edit MCP Settings"');
  console.log('4. Paste the configuration into your MCP settings');
  console.log('5. Restart Cursor/Claude Code');
  console.log('6. Start drawing and use MCP tools to analyze your artwork!\n');
}

// Main function
async function main() {
  try {
    console.log('🚀 Starting Draw-it-MCP...\n');
    
    // Check if we're in development or installed via npm
    const isDev = fs.existsSync(path.join(projectRoot, 'package-lock.json'));
    const nodeModulesExists = fs.existsSync(path.join(projectRoot, 'node_modules'));
    
    if (!nodeModulesExists) {
      console.log('📦 Installing dependencies... This may take a moment.');
      const npmInstall = spawn('npm', ['install'], {
        cwd: projectRoot,
        stdio: 'inherit',
        shell: true
      });
      
      await new Promise((resolve, reject) => {
        npmInstall.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`npm install failed with code ${code}`));
          }
        });
      });
    }

    // Find available port
    const port = await findAvailablePort(3001);
    console.log(`🌟 Found available port: ${port}`);
    
    // Always build on first run or if build doesn't exist
    const buildDir = path.join(projectRoot, '.next');
    if (!fs.existsSync(buildDir) || isFirstRun()) {
      console.log('🏗️  Building application for the first time...');
      const buildProcess = spawn('npx', ['next', 'build'], {
        cwd: projectRoot,
        stdio: 'inherit',
        shell: true
      });
      
      await new Promise((resolve, reject) => {
        buildProcess.on('close', (code) => {
          if (code === 0) {
            console.log('✅ Build completed successfully!');
            resolve();
          } else {
            reject(new Error(`Build failed with code ${code}`));
          }
        });
      });
    }

    // Start the application
    console.log('🎨 Launching Draw-it-MCP...\n');
    
    const serverProcess = spawn('npx', ['next', 'start', '-p', port.toString()], {
      cwd: projectRoot,
      stdio: 'inherit',
      shell: true,
      env: { ...process.env, PORT: port.toString() }
    });

    // Show success message
    setTimeout(() => {
      console.log('\n' + '='.repeat(60));
      console.log('🎉 Draw-it-MCP is running!');
      console.log(`🌐 Open: \x1b[32mhttp://localhost:${port}\x1b[0m`);
      console.log('');
      console.log('💡 Quick Tips:');
      console.log('  • Click colors to change brush color');
      console.log('  • Use different brush sizes for varied strokes');
      console.log('  • Save your drawings for later');
      console.log('  • Toggle dark/light theme');
      console.log('');
      console.log('🤖 Cursor & Claude Code Integration:');
      console.log('  • MCP server available for AI analysis');
      console.log('  • See MCP configuration below');
      console.log('');
      console.log('⏹️  Press Ctrl+C to stop');
      console.log('='.repeat(60) + '\n');
      
      // Show MCP configuration for Cursor & Claude Code
      showMCPConfiguration();
      
      // Open browser if first run
      if (isFirstRun()) {
        setTimeout(async () => {
          try {
            const open = await import('open');
            await open.default(`http://localhost:${port}`);
            console.log('🌐 Browser opened automatically!');
          } catch (error) {
            console.log('💡 Please open your browser and navigate to the URL above');
          }
        }, 2000);
      }
    }, 2000);

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down Draw-it-MCP...');
      serverProcess.kill('SIGINT');
      setTimeout(() => {
        console.log('👋 Thanks for using Draw-it-MCP!');
        process.exit(0);
      }, 1000);
    });

    // Handle server process exit
    serverProcess.on('close', (code) => {
      if (code !== 0) {
        console.error(`\n❌ Server process exited with code ${code}`);
        console.log('💡 Try running again or check for port conflicts');
      }
      process.exit(code);
    });

  } catch (error) {
    console.error('\n❌ Error starting Draw-it-MCP:');
    console.error(error.message);
    console.log('\n💡 Troubleshooting:');
    console.log('  • Make sure Node.js 18+ is installed');
    console.log('  • Check if port 3001 is available');
    console.log('  • Try running: npm install');
    console.log('  • If build fails, try: npx create-next-app@latest --typescript');
    console.log('  • For MCP setup: https://github.com/Pandoll-AI/draw-it-mcp#ai-powered-art-analysis-optional');
    process.exit(1);
  }
}

// Run the application
main().catch(console.error);