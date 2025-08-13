const express = require('express');
const { getDatabase } = require('../db/database');
const router = express.Router();

// Get all chat settings
router.get('/', async (req, res) => {
  try {
    const db = getDatabase();
    const settings = await db.all('SELECT * FROM chat_settings ORDER BY created_at DESC');
    
    // Parse JSON fields
    const parsedSettings = settings.map(setting => ({
      ...setting,
      icon: setting.icon ? JSON.parse(setting.icon) : null,
      showInSidebar: setting.show_in_sidebar
    }));
    
    res.json(parsedSettings);
  } catch (error) {
    console.error('Error fetching chat settings:', error);
    res.status(500).json({ error: 'Failed to fetch chat settings' });
  }
});

// Get chat setting by ID
router.get('/:id', async (req, res) => {
  try {
    const db = getDatabase();
    const setting = await db.get('SELECT * FROM chat_settings WHERE id = ?', [req.params.id]);
    
    if (!setting) {
      return res.status(404).json({ error: 'Chat setting not found' });
    }
    
    // Parse JSON fields
    const parsedSetting = {
      ...setting,
      icon: setting.icon ? JSON.parse(setting.icon) : null,
      showInSidebar: setting.show_in_sidebar
    };
    
    res.json(parsedSetting);
  } catch (error) {
    console.error('Error fetching chat setting:', error);
    res.status(500).json({ error: 'Failed to fetch chat setting' });
  }
});

// Create new chat setting
router.post('/', async (req, res) => {
  try {
    const db = getDatabase();
    const {
      id, author, icon, name, description, instructions, model,
      seed, temperature, top_p, frequency_penalty, presence_penalty,
      stream, showInSidebar
    } = req.body;

    const result = await db.run(`
      INSERT INTO chat_settings (
        id, author, icon, name, description, instructions, model,
        seed, temperature, top_p, frequency_penalty, presence_penalty,
        stream, show_in_sidebar
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id || null, author, icon ? JSON.stringify(icon) : null, name,
      description, instructions, model, seed, temperature, top_p,
      frequency_penalty, presence_penalty, stream ? 1 : 0,
      showInSidebar ? 1 : 0
    ]);

    res.status(201).json({ id: result.id || id, message: 'Chat setting created successfully' });
  } catch (error) {
    console.error('Error creating chat setting:', error);
    res.status(500).json({ error: 'Failed to create chat setting' });
  }
});

// Update chat setting
router.put('/:id', async (req, res) => {
  try {
    const db = getDatabase();
    const {
      author, icon, name, description, instructions, model,
      seed, temperature, top_p, frequency_penalty, presence_penalty,
      stream, showInSidebar
    } = req.body;

    const result = await db.run(`
      UPDATE chat_settings SET
        author = ?, icon = ?, name = ?, description = ?, instructions = ?,
        model = ?, seed = ?, temperature = ?, top_p = ?, frequency_penalty = ?,
        presence_penalty = ?, stream = ?, show_in_sidebar = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      author, icon ? JSON.stringify(icon) : null, name, description,
      instructions, model, seed, temperature, top_p, frequency_penalty,
      presence_penalty, stream ? 1 : 0, showInSidebar ? 1 : 0, req.params.id
    ]);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Chat setting not found' });
    }

    res.json({ message: 'Chat setting updated successfully' });
  } catch (error) {
    console.error('Error updating chat setting:', error);
    res.status(500).json({ error: 'Failed to update chat setting' });
  }
});

// Update showInSidebar only
router.patch('/:id/sidebar', async (req, res) => {
  try {
    const db = getDatabase();
    const { showInSidebar } = req.body;

    const result = await db.run(`
      UPDATE chat_settings SET
        show_in_sidebar = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [showInSidebar ? 1 : 0, req.params.id]);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Chat setting not found' });
    }

    res.json({ message: 'Sidebar setting updated successfully' });
  } catch (error) {
    console.error('Error updating sidebar setting:', error);
    res.status(500).json({ error: 'Failed to update sidebar setting' });
  }
});

// Delete chat setting
router.delete('/:id', async (req, res) => {
  try {
    const db = getDatabase();
    const result = await db.run('DELETE FROM chat_settings WHERE id = ?', [req.params.id]);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Chat setting not found' });
    }

    res.json({ message: 'Chat setting deleted successfully' });
  } catch (error) {
    console.error('Error deleting chat setting:', error);
    res.status(500).json({ error: 'Failed to delete chat setting' });
  }
});

module.exports = router;