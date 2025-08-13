const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create database directory if it doesn't exist
const fs = require('fs');
const dbDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize SQLite database
const dbPath = path.join(dbDir, 'chat.db');
const db = new sqlite3.Database(dbPath);

// Create tables
db.serialize(() => {
  // ChatSettings table
  db.run(`
    CREATE TABLE IF NOT EXISTS chat_settings (
      id INTEGER PRIMARY KEY,
      author TEXT NOT NULL,
      icon TEXT, -- JSON string for ImageSource
      name TEXT NOT NULL,
      description TEXT,
      instructions TEXT,
      model TEXT,
      seed INTEGER,
      temperature REAL,
      top_p REAL,
      frequency_penalty REAL,
      presence_penalty REAL,
      stream INTEGER DEFAULT 1,
      show_in_sidebar INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Conversations table
  db.run(`
    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY,
      gid INTEGER NOT NULL,
      timestamp INTEGER NOT NULL,
      title TEXT NOT NULL,
      model TEXT,
      system_prompt TEXT,
      messages TEXT NOT NULL, -- JSON string of ChatMessage[]
      marker INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // FileData table
  db.run(`
    CREATE TABLE IF NOT EXISTS file_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      data TEXT, -- base64 encoded file data
      type TEXT NOT NULL, -- mime type
      source TEXT NOT NULL, -- 'filename' or 'pasted'
      filename TEXT,
      size INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create indexes for performance
  db.run('CREATE INDEX IF NOT EXISTS idx_conversations_gid ON conversations(gid)');
  db.run('CREATE INDEX IF NOT EXISTS idx_conversations_timestamp ON conversations(timestamp DESC)');
  db.run('CREATE INDEX IF NOT EXISTS idx_chat_settings_show_in_sidebar ON chat_settings(show_in_sidebar)');
  
  console.log('Database initialized successfully!');
  console.log('Database location:', dbPath);
});

db.close();