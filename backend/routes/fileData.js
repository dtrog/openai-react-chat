const express = require('express');
const { getDatabase } = require('../db/database');
const router = express.Router();

// Get file data by ID
router.get('/:id', async (req, res) => {
  try {
    const db = getDatabase();
    const fileData = await db.get('SELECT * FROM file_data WHERE id = ?', [req.params.id]);
    
    if (!fileData) {
      return res.status(404).json({ error: 'File data not found' });
    }
    
    res.json(fileData);
  } catch (error) {
    console.error('Error fetching file data:', error);
    res.status(500).json({ error: 'Failed to fetch file data' });
  }
});

// Create new file data
router.post('/', async (req, res) => {
  try {
    const db = getDatabase();
    const { data, type, source, filename } = req.body;

    // Calculate file size (approximate for base64)
    const size = data ? Math.floor((data.length * 3) / 4) : 0;

    const result = await db.run(`
      INSERT INTO file_data (data, type, source, filename, size)
      VALUES (?, ?, ?, ?, ?)
    `, [data, type, source, filename || null, size]);

    res.status(201).json({ 
      id: result.id, 
      message: 'File data created successfully' 
    });
  } catch (error) {
    console.error('Error creating file data:', error);
    res.status(500).json({ error: 'Failed to create file data' });
  }
});

// Update file data
router.put('/:id', async (req, res) => {
  try {
    const db = getDatabase();
    const { data, type, source, filename } = req.body;

    // Calculate file size (approximate for base64)
    const size = data ? Math.floor((data.length * 3) / 4) : 0;

    const result = await db.run(`
      UPDATE file_data SET
        data = ?, type = ?, source = ?, filename = ?, size = ?
      WHERE id = ?
    `, [data, type, source, filename || null, size, req.params.id]);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'File data not found' });
    }

    res.json({ message: 'File data updated successfully' });
  } catch (error) {
    console.error('Error updating file data:', error);
    res.status(500).json({ error: 'Failed to update file data' });
  }
});

// Partial update file data
router.patch('/:id', async (req, res) => {
  try {
    const db = getDatabase();
    const updates = req.body;
    
    // Build dynamic update query
    const fields = [];
    const values = [];
    
    Object.keys(updates).forEach(key => {
      if (['data', 'type', 'source', 'filename'].includes(key)) {
        fields.push(`${key} = ?`);
        values.push(updates[key]);
      }
    });

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    // Recalculate size if data is updated
    if (updates.data) {
      fields.push('size = ?');
      values.push(Math.floor((updates.data.length * 3) / 4));
    }

    values.push(req.params.id);

    const result = await db.run(`
      UPDATE file_data SET ${fields.join(', ')} WHERE id = ?
    `, values);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'File data not found' });
    }

    res.json({ message: 'File data updated successfully', changes: result.changes });
  } catch (error) {
    console.error('Error updating file data:', error);
    res.status(500).json({ error: 'Failed to update file data' });
  }
});

// Delete file data
router.delete('/:id', async (req, res) => {
  try {
    const db = getDatabase();
    const result = await db.run('DELETE FROM file_data WHERE id = ?', [req.params.id]);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'File data not found' });
    }

    res.json({ message: 'File data deleted successfully' });
  } catch (error) {
    console.error('Error deleting file data:', error);
    res.status(500).json({ error: 'Failed to delete file data' });
  }
});

// Delete all file data
router.delete('/', async (req, res) => {
  try {
    const db = getDatabase();
    const result = await db.run('DELETE FROM file_data');

    res.json({ 
      message: 'All file data deleted successfully',
      deletedCount: result.changes 
    });
  } catch (error) {
    console.error('Error deleting all file data:', error);
    res.status(500).json({ error: 'Failed to delete all file data' });
  }
});

// Get file data statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const db = getDatabase();
    const stats = await db.get(`
      SELECT 
        COUNT(*) as total_files,
        SUM(size) as total_size,
        AVG(size) as avg_size,
        MIN(created_at) as oldest_file,
        MAX(created_at) as newest_file
      FROM file_data
    `);

    res.json(stats);
  } catch (error) {
    console.error('Error fetching file data statistics:', error);
    res.status(500).json({ error: 'Failed to fetch file data statistics' });
  }
});

module.exports = router;