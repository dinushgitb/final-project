import mysql from 'mysql2';

const db = mysql.createConnection({
  host: 'localhost',     // Make sure this is correct
  user: 'root',          // Your MySQL username
  password: '',          // Your MySQL password (set during installation)
  database: 'prowndatabase', // Create this database first
  port: 3306             // Default MySQL port
});

// Test the connection
db.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err);
    return;
  }
  console.log('Connected to MySQL database');
});

export default db;