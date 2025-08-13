# Database Configuration Guide

This application now supports **dual database modes** that can be configured via environment variables:

- **SQLite Mode**: Data stored on backend server with SQLite database
- **Browser Mode**: Data stored in browser using IndexedDB (original behavior)

## Quick Setup

### 1. Configure Database Mode

Copy the environment example and set your preferred mode:

```bash
cp .env.example .env
```

Edit `.env`:
```env
# Backend API URL (for SQLite mode)
VITE_BACKEND_URL=http://localhost:3001/api

# Database mode: 'sqlite' or 'browser'
VITE_DB_MODE=sqlite
```

### 2. For SQLite Mode

**Start the backend:**
```bash
# Install backend dependencies
cd backend
npm install

# Initialize database
npm run init-db

# Start backend server
npm start
```

**Start the frontend:**
```bash
# From project root
npm start
```

### 3. For Browser Mode

**Start only the frontend:**
```bash
# Set browser mode in .env
VITE_DB_MODE=browser

# Start frontend (no backend needed)
npm start
```

## Configuration Options

### Environment Variables

| Variable | Values | Description |
|----------|--------|-------------|
| `VITE_DB_MODE` | `sqlite` \| `browser` | Database storage mode |
| `VITE_BACKEND_URL` | URL | Backend API endpoint (SQLite mode only) |

### Database Modes Comparison

| Feature | SQLite Mode | Browser Mode |
|---------|-------------|--------------|
| **Data Location** | Backend server | Browser storage |
| **Cross-device Access** | ✅ Yes | ❌ No |
| **Data Persistence** | ✅ Survives browser clear | ❌ Browser-dependent |
| **Backend Required** | ✅ Yes | ❌ No |
| **Backup/Restore** | ✅ Easy database backup | ❌ Manual export only |
| **Multi-user Support** | ✅ Ready for expansion | ❌ Single user only |
| **Performance** | ✅ Better for large datasets | ⚠️ Limited by browser |
| **Offline Usage** | ❌ Requires backend | ✅ Full offline support |
| **Setup Complexity** | ⚠️ Backend required | ✅ Simple frontend-only |

## Mode Switching

You can switch between modes at any time:

1. **Change the environment variable** in `.env`
2. **Restart the application**
3. **Data migration** (manual process if needed)

### Important Notes

- **Data is NOT automatically migrated** between modes
- Each mode maintains its own separate data storage
- Switching modes will appear as if starting fresh (unless you manually migrate data)

## Data Migration Between Modes

### From Browser to SQLite

1. **Export data from browser** (developer console):
```javascript
// Export chat settings
const settings = await db.chatSettings.toArray();
console.log('Settings:', JSON.stringify(settings, null, 2));

// Export conversations
const conversations = await db.conversations.toArray();
console.log('Conversations:', JSON.stringify(conversations, null, 2));
```

2. **Import to SQLite backend** (via API):
```bash
# POST data to backend endpoints
curl -X POST http://localhost:3001/api/chat-settings \
  -H "Content-Type: application/json" \
  -d @exported-settings.json

curl -X POST http://localhost:3001/api/conversations \
  -H "Content-Type: application/json" \
  -d @exported-conversations.json
```

### From SQLite to Browser

1. **Export from backend**:
```bash
# Get all data via API
curl http://localhost:3001/api/chat-settings > settings.json
curl http://localhost:3001/api/conversations/recent/1000 > conversations.json
```

2. **Import to browser** (developer console):
```javascript
// Import settings
const settings = [/* your exported settings */];
await Promise.all(settings.map(s => db.chatSettings.add(s)));

// Import conversations  
const conversations = [/* your exported conversations */];
await Promise.all(conversations.map(c => db.conversations.add(c)));
```

## Development & Production

### Development Setup

**SQLite Mode:**
```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend  
npm start
```

**Browser Mode:**
```bash
# Single terminal: Frontend only
VITE_DB_MODE=browser npm start
```

### Production Deployment

**SQLite Mode:**
- Deploy backend with proper database backup strategy
- Deploy frontend with correct `VITE_BACKEND_URL`
- Ensure backend is accessible from frontend domain

**Browser Mode:**
- Deploy frontend only
- No backend infrastructure needed
- Users get isolated, local-only data

## Troubleshooting

### SQLite Mode Issues

**Backend connection failed:**
```bash
# Check backend status
curl http://localhost:3001/health

# Verify environment variables
echo $VITE_BACKEND_URL
echo $VITE_DB_MODE
```

**Database errors:**
```bash
# Reinitialize database
cd backend && npm run init-db

# Check database file
ls -la backend/data/chat.db
```

### Browser Mode Issues

**Data not persisting:**
- Check browser storage limits
- Verify IndexedDB is enabled
- Clear browser cache if needed

**Performance issues:**
- Browser mode has IndexedDB limitations
- Consider SQLite mode for large datasets

### Mode Detection

The application logs the selected mode to console:
```
Database mode: SQLite (Backend)
# or
Database mode: IndexedDB (Browser)
```

## Technical Implementation

### Architecture

```
Frontend
├── DatabaseFactory.ts (Mode selector)
├── BackendServices (SQLite mode)
│   ├── BackendChatSettingsService
│   ├── BackendConversationService
│   └── BackendFileDataService
└── IndexedDBServices (Browser mode)
    ├── IndexedDBChatSettingsService
    ├── IndexedDBConversationService
    └── IndexedDBFileDataService
```

### Service Layer

The `DatabaseFactory` automatically selects the appropriate service implementation based on `REACT_APP_DB_MODE`, providing a unified API to the frontend components.

### Backward Compatibility

All existing code continues to work unchanged. The factory pattern maintains the same interfaces regardless of the underlying storage mechanism.

---

## Quick Commands Reference

```bash
# Switch to SQLite mode
echo "VITE_DB_MODE=sqlite" >> .env

# Switch to Browser mode  
echo "VITE_DB_MODE=browser" >> .env

# Start backend (SQLite mode)
cd backend && npm start

# Start frontend
npm start

# Check mode in browser console
# Look for: "Database mode: SQLite (Backend)" or "Database mode: IndexedDB (Browser)"
```