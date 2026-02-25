const fs = require('fs');
const path = require('path');
const db = require('./database'); // Utiliza la misma conexión SQLite que el servidor

// Nombre del archivo que vamos a buscar
const jsonFileName = 'books.json';
const jsonFilePath = path.join(__dirname, jsonFileName);

// Verifica si el archivo existe
if (!fs.existsSync(jsonFilePath)) {
    console.error(`\n❌ Error: No se ha encontrado el archivo "${jsonFileName}".`);
    console.log(`Por favor, asegúrate de colocar tu archivo JSON en la carpeta raíz del proyecto con el nombre "${jsonFileName}".\n`);
    process.exit(1);
}

console.log(`\n📄 Archivo "${jsonFileName}" encontrado. Leyendo datos...`);

// Lee y parsea el archivo JSON
let booksData;
try {
    const rawData = fs.readFileSync(jsonFilePath, 'utf8');
    booksData = JSON.parse(rawData);
} catch (error) {
    console.error(`❌ Error leyendo o parseando el archivo JSON:`, error.message);
    process.exit(1);
}

// Verifica que sea un array
if (!Array.isArray(booksData)) {
    // Si es un objeto único con una propiedad que contiene el array (ej. { "books": [...] })
    const arrayKeys = Object.keys(booksData).filter(key => Array.isArray(booksData[key]));

    if (arrayKeys.length > 0) {
        booksData = booksData[arrayKeys[0]];
        console.log(`Array de libros detectado bajo la propiedad "${arrayKeys[0]}".`);
    } else {
        // Envolvemos el objeto en un array si solo hay un libro suelto
        booksData = [booksData];
        console.log(`Detectado objeto único. Convirtiendo a array...`);
    }
}

console.log(`Se han encontrado ${booksData.length} libros. Comenzando la importación...\n`);

// Prepara la consulta SQL
const sql = 'INSERT INTO books (title, author, year, genre, description, rating) VALUES (?,?,?,?,?,?)';

let successCount = 0;
let errorCount = 0;
let pending = booksData.length;

// Ejecuta las inserciones
booksData.forEach((book, index) => {
    // Intenta extraer los campos intentando diferentes nombres comunes
    const title = book.title || book.name || book.titulo || book.nombre || 'Sin título';
    const author = book.author || book.autor || book.writer || 'Autor desconocido';
    const year = book.year || book.publishedDate || book.anio || book.año || book.publicacion || null;
    const genre = book.genre || book.category || book.genero || book.categoria || book.edicion || null;
    const description = book.description || book.summary || book.descripcion || book.resumen || book.intro || null;
    const rating = book.rating || book.puntuacion || book.score || null;

    db.run(sql, [title, author, year, genre, description, rating], function (err) {
        if (err) {
            console.error(`❌ Error insertando: "${title}" -`, err.message);
            errorCount++;
        } else {
            console.log(`✅ Añadido (ID: ${this.lastID}): ${title}`);
            successCount++;
        }

        pending--;
        if (pending === 0) {
            finalizarScript();
        }
    });
});

// En caso de que el array esté vacío
if (pending === 0) {
    finalizarScript();
}

function finalizarScript() {
    console.log(`\n🎉 ¡Importación finalizada!`);
    console.log(`✅ Insertados correctamente: ${successCount}`);
    if (errorCount > 0) console.log(`❌ Errores: ${errorCount}`);

    console.log(`\nAbre tu navegador en http://localhost:3000 para ver los nuevos libros.\n`);

    // Cerramos la conexión a la bd
    db.close((err) => {
        if (err) console.error(err.message);
        process.exit(0);
    });
}
