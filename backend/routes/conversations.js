const express = require('express');
const { getDatabase } = require('../db/database');
const router = express.Router();

// Get conversation by ID
router.get('/:id', async (req, res) => {
  try {
    const db = getDatabase();
    const conversation = await db.get('SELECT * FROM conversations WHERE id = ?', [req.params.id]);
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    // Parse JSON fields
    const parsedConversation = {
      ...conversation,
      systemPrompt: conversation.system_prompt,
      messages: JSON.parse(conversation.messages),
      marker: Boolean(conversation.marker)
    };
    
    res.json(parsedConversation);
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

// Search conversations by title
router.get('/search/title', async (req, res) => {
  try {
    const { q: searchString } = req.query;
    if (!searchString) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const db = getDatabase();
    const conversations = await db.all(`
      SELECT * FROM conversations 
      WHERE LOWER(title) LIKE LOWER(?) 
      ORDER BY timestamp DESC
    `, [`%${searchString}%`]);
    
    // Parse JSON fields
    const parsedConversations = conversations.map(conv => ({
      ...conv,
      systemPrompt: conv.system_prompt,
      messages: JSON.parse(conv.messages),
      marker: Boolean(conv.marker)
    }));
    
    res.json(parsedConversations);
  } catch (error) {
    console.error('Error searching conversations:', error);
    res.status(500).json({ error: 'Failed to search conversations' });
  }
});

// Search within conversations (messages)
router.get('/search/messages', async (req, res) => {
  try {
    const { q: searchString } = req.query;
    if (!searchString) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const db = getDatabase();
    const conversations = await db.all(`
      SELECT * FROM conversations 
      WHERE messages LIKE ? 
      ORDER BY timestamp DESC
    `, [`%${searchString}%`]);
    
    // Parse JSON fields
    const parsedConversations = conversations.map(conv => ({
      ...conv,
      systemPrompt: conv.system_prompt,
      messages: JSON.parse(conv.messages),
      marker: Boolean(conv.marker)
    }));
    
    res.json(parsedConversations);
  } catch (error) {
    console.error('Error searching within conversations:', error);
    res.status(500).json({ error: 'Failed to search within conversations' });
  }
});

// Get recent conversations (titles only)
router.get('/recent/:limit?', async (req, res) => {
  try {
    const limit = parseInt(req.params.limit) || 200;
    const db = getDatabase();
    const conversations = await db.all(`
      SELECT id, gid, timestamp, title, model, system_prompt, marker, created_at, updated_at
      FROM conversations 
      ORDER BY timestamp DESC 
      LIMIT ?
    `, [limit]);
    
    // Return conversations with empty messages array
    const conversationsWithEmptyMessages = conversations.map(conv => ({
      ...conv,
      systemPrompt: conv.system_prompt,
      messages: "[]",
      marker: Boolean(conv.marker)
    }));
    
    res.json(conversationsWithEmptyMessages);
  } catch (error) {
    console.error('Error loading recent conversations:', error);
    res.status(500).json({ error: 'Failed to load recent conversations' });
  }
});

// Count conversations by GID
router.get('/count/:gid', async (req, res) => {
  try {
    const db = getDatabase();
    const result = await db.get('SELECT COUNT(*) as count FROM conversations WHERE gid = ?', [req.params.gid]);
    res.json({ count: result.count });
  } catch (error) {
    console.error('Error counting conversations:', error);
    res.status(500).json({ error: 'Failed to count conversations' });
  }
});

// Create new conversation
router.post('/', async (req, res) => {
  try {
    const db = getDatabase();
    const { id, gid, timestamp, title, model, systemPrompt, messages, marker } = req.body;

    const result = await db.run(`
      INSERT INTO conversations (id, gid, timestamp, title, model, system_prompt, messages, marker)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, gid, timestamp, title, model || null, systemPrompt || '',
      JSON.stringify(messages || []), marker ? 1 : 0
    ]);

    res.status(201).json({ 
      id: result.id || id, 
      message: 'Conversation created successfully' 
    });
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// Update conversation
router.put('/:id', async (req, res) => {
  try {
    const db = getDatabase();
    const { gid, timestamp, title, model, systemPrompt, messages, marker } = req.body;

    const result = await db.run(`
      UPDATE conversations SET
        gid = ?, timestamp = ?, title = ?, model = ?, system_prompt = ?,
        messages = ?, marker = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      gid, timestamp, title, model || null, systemPrompt || '',
      JSON.stringify(messages || []), marker ? 1 : 0, req.params.id
    ]);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json({ message: 'Conversation updated successfully' });
  } catch (error) {
    console.error('Error updating conversation:', error);
    res.status(500).json({ error: 'Failed to update conversation' });
  }
});

// Partial update conversation
router.patch('/:id', async (req, res) => {
  try {
    const db = getDatabase();
    const updates = req.body;
    
    // Build dynamic update query
    const fields = [];
    const values = [];
    
    Object.keys(updates).forEach(key => {
      if (key === 'systemPrompt') {
        fields.push('system_prompt = ?');
        values.push(updates[key]);
      } else if (key === 'messages') {
        fields.push('messages = ?');
        values.push(JSON.stringify(updates[key]));
      } else if (key === 'marker') {
        fields.push('marker = ?');
        values.push(updates[key] ? 1 : 0);
      } else if (['gid', 'timestamp', 'title', 'model'].includes(key)) {
        fields.push(`${key} = ?`);
        values.push(updates[key]);
      }
    });

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(req.params.id);

    const result = await db.run(`
      UPDATE conversations SET ${fields.join(', ')} WHERE id = ?
    `, values);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json({ message: 'Conversation updated successfully', changes: result.changes });
  } catch (error) {
    console.error('Error updating conversation:', error);
    res.status(500).json({ error: 'Failed to update conversation' });
  }
});

// Delete conversation
router.delete('/:id', async (req, res) => {
  try {
    const db = getDatabase();
    
    // First get the conversation to check for file data references
    const conversation = await db.get('SELECT messages FROM conversations WHERE id = ?', [req.params.id]);
    
    if (conversation) {
      const messages = JSON.parse(conversation.messages);
      
      // Delete associated file data
      for (const message of messages) {
        if (message.fileDataRef && message.fileDataRef.length > 0) {
          for (const fileRef of message.fileDataRef) {
            if (fileRef.id) {
              await db.run('DELETE FROM file_data WHERE id = ?', [fileRef.id]);
            }
          }
        }
      }
    }

    const result = await db.run('DELETE FROM conversations WHERE id = ?', [req.params.id]);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json({ message: 'Conversation deleted successfully' });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

// Delete all conversations
router.delete('/', async (req, res) => {
  try {
    const db = getDatabase();
    
    // Delete all conversations and file data
    await db.run('DELETE FROM conversations');
    await db.run('DELETE FROM file_data');

    res.json({ message: 'All conversations deleted successfully' });
  } catch (error) {
    console.error('Error deleting all conversations:', error);
    res.status(500).json({ error: 'Failed to delete all conversations' });
  }
});

// Delete conversations by GID
router.delete('/gid/:gid', async (req, res) => {
  try {
    const db = getDatabase();
    
    // Get all conversations with this GID to delete associated file data
    const conversations = await db.all('SELECT id, messages FROM conversations WHERE gid = ?', [req.params.gid]);
    
    // Delete associated file data for all conversations
    for (const conversation of conversations) {
      const messages = JSON.parse(conversation.messages);
      for (const message of messages) {
        if (message.fileDataRef && message.fileDataRef.length > 0) {
          for (const fileRef of message.fileDataRef) {
            if (fileRef.id) {
              await db.run('DELETE FROM file_data WHERE id = ?', [fileRef.id]);
            }
          }
        }
      }
    }

    const result = await db.run('DELETE FROM conversations WHERE gid = ?', [req.params.gid]);

    res.json({ 
      message: 'Conversations deleted successfully', 
      deletedCount: result.changes 
    });
  } catch (error) {
    console.error('Error deleting conversations by GID:', error);
    res.status(500).json({ error: 'Failed to delete conversations by GID' });
  }
});

module.exports = router;