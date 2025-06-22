# 🎨 Draw-it-MCP

**A beautiful, AI-powered drawing application that runs in your browser!**

Create amazing artwork with an intuitive interface, save your drawings, and get AI-powered insights through Claude Desktop integration.

![Draw-it-MCP Preview](https://img.shields.io/badge/Status-Ready%20to%20Draw-brightgreen?style=for-the-badge&logo=palette)

## ✨ Why Draw-it-MCP?

🎨 **Intuitive Drawing** - Clean, responsive canvas with professional tools  
💾 **Smart Saving** - Never lose your artwork with auto-save features  
🌙 **Beautiful Themes** - Dark and light modes for comfortable drawing  
🤖 **AI Integration** - Let Claude analyze and discuss your artwork  
📱 **Works Everywhere** - Perfect on desktop, tablet, and mobile  
⚡ **Lightning Fast** - 60 FPS smooth drawing experience  

## 🚀 Quick Start

### 🎨 Just Want to Draw? (Temporary Use)
**One command to start drawing immediately:**

```bash
npx draw-it-mcp
```

Perfect for quick sketches and trying out the app!

### 🤖 Want AI Integration? (Permanent Installation)
**For Claude Code/Cursor/Claude Desktop integration:**

```bash
npm install -g draw-it-mcp
draw-it-mcp
```

This installs permanently and enables stable MCP connections.

### What happens when you run it:
1. 📦 Installs dependencies (first time only)
2. 🏗️ Builds the application (first time only)  
3. 🚀 Starts the server on an available port
4. 🌐 Opens your browser to the drawing app
5. 🎨 Start creating!

## 🎯 Perfect For

- **Digital Artists** - Sketch ideas and concepts quickly
- **Students** - Take visual notes and create diagrams  
- **Designers** - Rapid prototyping and wireframing
- **Everyone** - Fun, creative expression for all ages
- **AI Enthusiasts** - Explore AI-powered art analysis

## 🎨 Features That Make Drawing Fun

### 🎪 Drawing Tools
- **6 beautiful colors** + custom color picker
- **4 brush sizes** with visual indicators
- **Brush and eraser** tools
- **Unlimited undo/redo** 
- **One-click clear canvas**

### 💾 Smart File Management  
- **Auto-save prompts** - never lose your work
- **High-quality thumbnails** - see all your drawings at a glance
- **Smart save system** - updates existing drawings seamlessly
- **PNG export** - download your art anytime

### 🌟 Delightful Experience
- **Instant theme switching** - dark/light modes
- **Touch support** - perfect for tablets
- **Keyboard shortcuts** - for power users
- **Responsive design** - looks great on any screen
- **60 FPS rendering** - silky smooth drawing

## 🤖 AI-Powered Art Analysis (Optional)

Connect with Claude Desktop to unlock AI superpowers:

### What Claude Can Do With Your Art:
- 🔍 **Analyze composition** and artistic techniques
- 🎯 **Identify shapes** and geometric elements  
- 💡 **Suggest improvements** and creative ideas
- 📊 **Provide detailed feedback** on your drawings
- 🎨 **Discuss artistic concepts** and inspiration

### Quick Setup for AI Code Editors:

> **⚠️ Important**: For stable MCP connections, install globally first: `npm install -g draw-it-mcp`

#### 🤖 Claude Code (Recommended)
1. **Install Draw-it-MCP globally**: `npm install -g draw-it-mcp`
2. **Install Claude Code**: [Download from Anthropic](https://claude.ai/code)
3. **Start Draw-it-MCP**: `draw-it-mcp` 
4. **Add MCP configuration** to your Claude Code settings:
   ```json
   {
     "mcpServers": {
       "draw-it-mcp": {
         "command": "draw-it-mcp",
         "args": ["mcp:server"]
       }
     }
   }
   ```
5. **Restart Claude Code** and try: *"Can you analyze my current drawing?"*

#### ⚡ Cursor IDE  
1. **Install Draw-it-MCP globally**: `npm install -g draw-it-mcp`
2. **Install Cursor**: [Download from cursor.sh](https://cursor.sh/)
3. **Start Draw-it-MCP**: `draw-it-mcp`
4. **Configure MCP** in Cursor settings (`~/.cursor/claude_desktop_config.json`):
   ```json
   {
     "mcpServers": {
       "draw-it-mcp": {
         "command": "draw-it-mcp", 
         "args": ["mcp:server"]
       }
     }
   }
   ```
5. **Restart Cursor** and ask Claude about your drawings!

#### 🖥️ Claude Desktop (Alternative)
1. **Install Draw-it-MCP globally**: `npm install -g draw-it-mcp`
2. **Add to Claude Desktop config** at `~/Library/Application Support/Claude/claude_desktop_config.json`:
   ```json
   {
     "mcpServers": {
       "draw-it-mcp": {
         "command": "draw-it-mcp",
         "args": ["mcp:server"] 
       }
     }
   }
   ```
3. **Restart Claude Desktop** and try asking about your drawings!

## 📱 How to Use

### Getting Started (30 seconds!)
1. Run `npx draw-it-mcp` (temporary) or `draw-it-mcp` (if globally installed)
2. Browser opens automatically to the drawing app
3. Click a color to select it
4. Choose your brush size
5. Start drawing on the canvas!
6. Click "Save" when you're happy with your art

### Pro Tips 🏆
- **Ctrl+Z** to undo, **Ctrl+Y** to redo
- **Click the theme toggle** (🌙/☀️) to switch dark/light mode
- **Save early, save often** - your drawings are precious!
- **Try different brush sizes** for varied artistic effects
- **Use the eraser** to perfect your details

## 🛠️ System Requirements

- **Node.js 18+** (Download from [nodejs.org](https://nodejs.org))
- **Modern web browser** (Chrome, Firefox, Safari, Edge)
- **2GB RAM** (recommended)
- **Any operating system** (Windows, macOS, Linux)

## 🌍 Perfect for Teams

Share the magic! Anyone can start their own drawing session:

```bash
# Team member 1 (temporary use)
npx draw-it-mcp

# Team member 2 (if globally installed)
draw-it-mcp

# Different ports automatically chosen - everyone gets their own space!
```

## 🆘 Need Help?

### Common Issues & Solutions

**🔧 "Command not found"**
- Install Node.js from [nodejs.org](https://nodejs.org)
- Restart your terminal

**🔧 "Port already in use"**
- Don't worry! The app automatically finds an available port
- Check the terminal output for the correct URL

**🔧 "Browser doesn't open"**
- Look for the URL in terminal (something like `http://localhost:3001`)
- Copy and paste it into your browser

**🔧 "Slow performance"**
- Try closing other browser tabs
- Restart the application with `npx draw-it-mcp`

### Still stuck?
Open an issue on [GitHub](https://github.com/draw-it-mcp/draw-it-mcp/issues) - we're here to help! 🤝

## 🏆 What People Are Saying

> *"Finally, a drawing app that just works! The Claude integration is mind-blowing."* - Digital Artist

> *"Perfect for quick sketches and wireframes. Love the clean interface!"* - UX Designer  

> *"My kids love drawing on this, and I love that it's educational with AI."* - Parent & Teacher

> *"One command and I'm drawing. Can't get simpler than that!"* - Developer

## 🎉 Ready to Create?

Don't wait - start your artistic journey now:

```bash
# Quick try (temporary)
npx draw-it-mcp

# Full experience with AI (permanent)
npm install -g draw-it-mcp
draw-it-mcp
```

**Happy drawing! 🎨✨**

---

<p align="center">
  <strong>Made with ❤️ for creators everywhere</strong><br>
  <a href="https://github.com/draw-it-mcp/draw-it-mcp">⭐ Star on GitHub</a> •
  <a href="https://github.com/draw-it-mcp/draw-it-mcp/issues">🐛 Report Issues</a> •
  <a href="#-ai-powered-art-analysis-optional">🤖 Claude Setup</a>
</p>