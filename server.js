const express = require('express');
const cors = require('cors');
const db = require('./database');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json()); // To parse JSON bodies
app.use(express.static(path.join(__dirname, 'public'))); // Serve frontend files

// --- API Endpoints ---

// GET all books
app.get('/api/books', (req, res) => {
    const { search } = req.query;
    let sql = 'SELECT * FROM books';
    const params = [];

    if (search) {
        sql += ' WHERE title LIKE ? OR author LIKE ? OR genre LIKE ?';
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
    }

    db.all(sql, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({
            message: 'success',
            data: rows
        });
    });
});

// GET a single book by id
app.get('/api/books/:id', (req, res) => {
    const sql = 'SELECT * FROM books WHERE id = ?';
    db.get(sql, [req.params.id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!row) {
            res.status(404).json({ error: 'Book not found' });
            return;
        }
        res.json({
            message: 'success',
            data: row
        });
    });
});

// POST a new book
app.post('/api/books', (req, res) => {
    const { title, author, year, genre, description, rating } = req.body;

    if (!title || !author) {
        res.status(400).json({ error: 'Title and author are required' });
        return;
    }

    const sql = 'INSERT INTO books (title, author, year, genre, description, rating) VALUES (?,?,?,?,?,?)';
    const params = [title, author, year, genre, description, rating];

    db.run(sql, params, function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.status(201).json({
            message: 'success',
            data: {
                id: this.lastID,
                title, author, year, genre, description, rating
            }
        });
    });
});

// PUT (update) an existing book
app.put('/api/books/:id', (req, res) => {
    const { title, author, year, genre, description, rating } = req.body;
    const { id } = req.params;

    const sql = `
        UPDATE books 
        SET title = COALESCE(?, title), 
            author = COALESCE(?, author), 
            year = COALESCE(?, year), 
            genre = COALESCE(?, genre), 
            description = COALESCE(?, description),
            rating = COALESCE(?, rating)
        WHERE id = ?`;

    const params = [title, author, year, genre, description, rating, id];

    db.run(sql, params, function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            res.status(404).json({ error: 'Book not found' });
            return;
        }
        res.json({
            message: 'success',
            data: { id, title, author, year, genre, description, rating }
        });
    });
});

// DELETE a book
app.delete('/api/books/:id', (req, res) => {
    const sql = 'DELETE FROM books WHERE id = ?';
    db.run(sql, req.params.id, function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            res.status(404).json({ error: 'Book not found' });
            return;
        }
        res.json({ message: 'deleted', changes: this.changes });
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
