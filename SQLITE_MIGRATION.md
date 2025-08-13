# SQLite Migration Guide

This guide explains how to migrate from IndexedDB (browser storage) to SQLite (backend database) for persistent storage.

## Architecture Changes

### Before (IndexedDB)
- Data stored in the browser using Dexie.js wrapper around IndexedDB
- All data operations happen client-side
- Data is tied to the browser/domain

### After (SQLite + Backend API)
- Data stored in SQLite database on the server
- Client communicates with backend via REST API
- Data is accessible from any browser/device
- Centralized storage with backup capabilities

## Setup Instructions

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Initialize SQLite database
npm run init-db

# Start the backend server
npm run dev  # Development mode
# or
npm start    # Production mode
```

The backend will run on `http://localhost:3001` by default.

### 2. Frontend Configuration

```bash
# Copy environment configuration
cp .env.example .env

# Edit .env to match your backend URL
REACT_APP_BACKEND_URL=http://localhost:3001/api
```

### 3. Start the Application

```bash
# Start frontend (from project root)
npm start

# The frontend will run on http://localhost:3000
# It will automatically connect to the backend API
```

## API Endpoints

### Chat Settings
- `GET /api/chat-settings` - Get all chat settings
- `GET /api/chat-settings/:id` - Get specific chat setting
- `POST /api/chat-settings` - Create new chat setting
- `PUT /api/chat-settings/:id` - Update chat setting
- `PATCH /api/chat-settings/:id/sidebar` - Update sidebar visibility
- `DELETE /api/chat-settings/:id` - Delete chat setting

### Conversations
- `GET /api/conversations/:id` - Get conversation by ID
- `GET /api/conversations/recent/:limit?` - Get recent conversations
- `GET /api/conversations/search/title?q=query` - Search by title
- `GET /api/conversations/search/messages?q=query` - Search in messages
- `GET /api/conversations/count/:gid` - Count conversations by GID
- `POST /api/conversations` - Create conversation
- `PUT /api/conversations/:id` - Update conversation
- `PATCH /api/conversations/:id` - Partial update
- `DELETE /api/conversations/:id` - Delete conversation
- `DELETE /api/conversations/gid/:gid` - Delete by GID
- `DELETE /api/conversations` - Delete all conversations

### File Data
- `GET /api/file-data/:id` - Get file data
- `GET /api/file-data/stats/summary` - Get storage statistics
- `POST /api/file-data` - Upload file data
- `PUT /api/file-data/:id` - Update file data
- `PATCH /api/file-data/:id` - Partial update
- `DELETE /api/file-data/:id` - Delete file data
- `DELETE /api/file-data` - Delete all file data

## Database Schema

### chat_settings
```sql
CREATE TABLE chat_settings (
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
);
```

### conversations
```sql
CREATE TABLE conversations (
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
);
```

### file_data
```sql
CREATE TABLE file_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  data TEXT, -- base64 encoded file data
  type TEXT NOT NULL, -- mime type
  source TEXT NOT NULL, -- 'filename' or 'pasted'
  filename TEXT,
  size INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Migration from IndexedDB

### Automatic Migration (Recommended)
The frontend automatically falls back to backend API calls. Your existing IndexedDB data will remain in the browser but new data will be stored in SQLite.

### Manual Data Export/Import
If you need to migrate existing data:

1. **Export from browser console:**
```javascript
// Export chat settings
const settings = await db.chatSettings.toArray();
console.log('Chat Settings:', JSON.stringify(settings, null, 2));

// Export conversations  
const conversations = await db.conversations.toArray();
console.log('Conversations:', JSON.stringify(conversations, null, 2));
```

2. **Import via API:**
```bash
# Use curl or a tool like Postman to POST the data to the respective endpoints
curl -X POST http://localhost:3001/api/chat-settings -H "Content-Type: application/json" -d @settings.json
curl -X POST http://localhost:3001/api/conversations -H "Content-Type: application/json" -d @conversations.json
```

## Benefits of SQLite Migration

1. **Cross-Device Access:** Access your conversations from any device
2. **Data Persistence:** Data survives browser clearing/reinstalls
3. **Backup & Recovery:** Easy database backup and restore
4. **Performance:** Better performance for large datasets
5. **Scalability:** Can handle much larger datasets than IndexedDB
6. **Data Integrity:** ACID transactions and proper foreign keys
7. **Search Performance:** Better full-text search capabilities
8. **Multi-User Support:** Foundation for multi-user features

## Production Deployment

### Backend Deployment
1. Set `NODE_ENV=production`
2. Configure proper CORS origins
3. Use process manager like PM2
4. Set up reverse proxy (nginx)
5. Configure backup strategy for SQLite database

### Database Backup
```bash
# Backup SQLite database
cp backend/data/chat.db backup/chat-$(date +%Y%m%d).db

# Or use SQLite backup command
sqlite3 backend/data/chat.db ".backup backup/chat-$(date +%Y%m%d).db"
```

## Troubleshooting

### Backend Connection Issues
1. Check backend is running: `curl http://localhost:3001/health`
2. Verify CORS configuration in backend/server.js
3. Check frontend .env file for correct REACT_APP_BACKEND_URL

### Database Issues  
1. Reinitialize database: `npm run init-db`
2. Check database permissions
3. Verify SQLite file location: `backend/data/chat.db`

### Data Migration Issues
1. Check network connectivity between frontend and backend
2. Verify API endpoints are working via curl/Postman
3. Check browser console for JavaScript errors