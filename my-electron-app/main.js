const { app, BrowserWindow, ipcMain } = require('electron');
const puppeteer = require('puppeteer');
const path = require('path');

let mainWindow;
let browser; // Puppeteer-controlled Chrome instance

app.whenReady().then(() => {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), // Optional for security
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile('index.html'); // Your app's UI

  // Launch Chrome via Puppeteer
  launchChrome();
});

// Function to launch and integrate Chrome
async function launchChrome() {
  try {
    // Path to your system's Chrome executable (adjust for your OS)
    const chromePath = process.platform === 'win32' 
      ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
      : process.platform === 'darwin' 
        ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
        : '/usr/bin/google-chrome';

    browser = await puppeteer.launch({
      executablePath: chromePath, // Use full Google Chrome
      headless: false, // Visible window
      args: ['--no-sandbox', '--disable-setuid-sandbox'] // Optional flags
    });

    const page = await browser.newPage();
    await page.goto('https://www.google.com'); // Example navigation

    console.log('Chrome integrated and launched successfully!');
    
    // Optional: Communicate with Electron UI via IPC
    ipcMain.on('close-chrome', async () => {
      await browser.close();
    });
  } catch (error) {
    console.error('Error launching Chrome:', error);
  }
}

// Clean up on app quit
app.on('window-all-closed', async () => {
  if (browser) await browser.close();
  if (process.platform !== 'darwin') app.quit();
});