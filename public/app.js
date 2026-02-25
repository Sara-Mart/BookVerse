const API_URL = '/api/books';

// DOM Elements
const bookForm = document.getElementById('book-form');
const booksContainer = document.getElementById('books-container');
const emptyState = document.getElementById('empty-state');
const searchInput = document.getElementById('search-input');
const totalBooksEl = document.getElementById('total-books');
const formTitle = document.getElementById('form-title');
const submitBtn = document.getElementById('submit-btn');
const cancelBtn = document.getElementById('cancel-btn');
const toast = document.getElementById('toast');

// Form Inputs
const idInput = document.getElementById('book-id');
const titleInput = document.getElementById('title');
const authorInput = document.getElementById('author');
const yearInput = document.getElementById('year');
const genreInput = document.getElementById('genre');
const ratingInput = document.getElementById('rating');
const descriptionInput = document.getElementById('description');

// State
let currentlyEditingId = null;
let searchTimeout = null;

// Mobile Menu Toggle
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const sidebarLeft = document.querySelector('.sidebar-left');

if (mobileMenuBtn && sidebarLeft) {
    mobileMenuBtn.addEventListener('click', () => {
        sidebarLeft.classList.toggle('open');
    });

    // Close sidebar when clicking a link on mobile
    const navItems = sidebarLeft.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            if (window.innerWidth <= 1024) {
                sidebarLeft.classList.remove('open');
            }
        });
    });
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    fetchBooks();
});

// Fetch all books
async function fetchBooks(searchQuery = '') {
    try {
        const url = searchQuery ? `${API_URL}?search=${encodeURIComponent(searchQuery)}` : API_URL;
        const response = await fetch(url);

        if (!response.ok) throw new Error('Failed to fetch books');

        const { data } = await response.json();
        renderBooks(data);
    } catch (error) {
        showToast('Error loading books', 'error');
        console.error(error);
    }
}

// Render books to the grid
function renderBooks(books) {
    if (totalBooksEl) totalBooksEl.textContent = books.length;
    booksContainer.innerHTML = '';

    if (books.length === 0) {
        emptyState.style.display = 'flex';
    } else {
        emptyState.style.display = 'none';

        books.forEach((book, index) => {
            // Assign a random cover color class (1 to 4) based on id or index to make it look nice
            const coverNum = (book.id % 4) + 1;

            const card = document.createElement('div');
            card.className = 'book-card';

            // Replicating the BookVerse design card look
            card.innerHTML = `
                <div class="book-cover cover-${coverNum}"></div>
                <h3 class="book-title" title="${escapeHTML(book.title)}">${escapeHTML(book.title)}</h3>
                <div class="book-author">${escapeHTML(book.author)}</div>
                
                <div class="book-rating">${book.rating !== null ? book.rating : '-'} <span style="color:#fccc95">⭐</span></div>
                
                <div class="card-actions">
                    <button class="btn-card btn-update" onclick="editBook(${book.id})">Update</button>
                    <button class="btn-card btn-delete" onclick="deleteBook(${book.id})">Delete</button>
                </div>
            `;
            booksContainer.appendChild(card);
        });
    }
}

// Handle Form Submission
bookForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const bookData = {
        title: titleInput.value.trim(),
        author: authorInput.value.trim(),
        year: yearInput.value ? parseInt(yearInput.value) : null,
        genre: genreInput.value.trim() || null,
        rating: ratingInput.value ? parseFloat(ratingInput.value) : null,
        description: descriptionInput.value.trim() || null
    };

    if (!bookData.title || !bookData.author) {
        showToast('Title and Author are required', 'error');
        return;
    }

    try {
        if (currentlyEditingId) {
            // Update existing book
            const response = await fetch(`${API_URL}/${currentlyEditingId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bookData)
            });

            if (!response.ok) throw new Error('Failed to update book');
            showToast('Book updated successfully!', 'success');
        } else {
            // Add new book
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bookData)
            });

            if (!response.ok) throw new Error('Failed to add book');
            showToast('Book added successfully!', 'success');
        }

        resetForm();
        fetchBooks(searchInput.value);
    } catch (error) {
        showToast('Operation failed', 'error');
        console.error(error);
    }
});

// Edit Book (Load into form)
async function editBook(id) {
    try {
        const response = await fetch(`${API_URL}/${id}`);
        if (!response.ok) throw new Error('Book not found');

        const { data: book } = await response.json();

        currentlyEditingId = book.id;
        idInput.value = book.id;
        titleInput.value = book.title;
        authorInput.value = book.author;
        yearInput.value = book.year || '';
        genreInput.value = book.genre || '';
        ratingInput.value = book.rating || '';
        descriptionInput.value = book.description || '';

        formTitle.textContent = 'Edit Book';
        submitBtn.textContent = 'Update Book';
        cancelBtn.style.display = 'inline-flex';

        // Scroll to top on mobile
        if (window.innerWidth <= 1024) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    } catch (error) {
        showToast('Failed to load book details', 'error');
        console.error(error);
    }
}

// Delete Book
async function deleteBook(id) {
    if (!confirm('Are you sure you want to delete this book from the vault?')) return;

    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('Failed to delete book');

        showToast('Book deleted successfully', 'success');
        if (currentlyEditingId === id) resetForm(); // Reset if we are currently editing it
        fetchBooks(searchInput.value);
    } catch (error) {
        showToast('Failed to delete book', 'error');
        console.error(error);
    }
}

// Search functionality with debounce
searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        fetchBooks(e.target.value);
    }, 300); // 300ms debounce
});

// Cancel Edit
cancelBtn.addEventListener('click', resetForm);

// Reset Form to Add mode
function resetForm() {
    bookForm.reset();
    currentlyEditingId = null;
    idInput.value = '';

    if (ratingInput) ratingInput.value = '';

    formTitle.textContent = 'Add New Book';
    submitBtn.textContent = 'Save Book';
    cancelBtn.style.display = 'none';
}

// Toast Notification System
function showToast(message, type = 'success') {
    toast.textContent = message;
    toast.className = `toast ${type} show`;

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// XSS Prevention Utility
function escapeHTML(str) {
    if (!str) return '';
    return str.toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
