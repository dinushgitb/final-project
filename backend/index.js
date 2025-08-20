import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { log } from 'node:console';
import db from './db.js';

const app = express();
app.use(express.json());
app.use(cors());

const JWT_SECRET = "your_secret_key"; // change this to a strong secret

// ✅ SQL queries (create tables)
const createTablesQueries = [
  // Service providers table
  `CREATE TABLE IF NOT EXISTS service_providers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    service_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  
  // Customers table
  `CREATE TABLE IF NOT EXISTS customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`
];

// ✅ Execute table creation queries
createTablesQueries.forEach((query, index) => {
  db.query(query, (err) => {
    if (err) {
      log(`Error creating table ${index + 1}:`, err);
    } else {
      log(`Table ${index + 1} created successfully`);
    }
  });
});

// ✅ Root route
app.get('/', (req, res) => {
  res.send('Welcome to the Authentication API! Available endpoints: /service-provider/signup, /service-provider/signin, /customer/signup, /customer/signin');
});

// ✅ SERVICE PROVIDER SIGNUP API
app.post('/service-provider/signup', (req, res) => {
  const { service_id, email, phone_number, password } = req.body;

  // Validate required fields
  if (!service_id || !email || !phone_number || !password) {
    return res.status(400).json({ message: 'All fields are required: service_id, email, phone_number, password' });
  }

  // Check if service provider already exists (by email or service_id)
  db.query(
    'SELECT * FROM service_providers WHERE email = ? OR service_id = ?', 
    [email, service_id], 
    async (err, results) => {
      if (err) {
        log('Error in service provider signup query:', err);
        return res.status(500).json({ error: 'Database query failed' });
      }

      if (results.length > 0) {
        const existingField = results[0].email === email ? 'email' : 'service ID';
        return res.status(400).json({ message: `Service provider with this ${existingField} already exists` });
      }

      try {
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert new service provider
        db.query(
          'INSERT INTO service_providers (service_id, email, phone_number, password) VALUES (?, ?, ?, ?)',
          [service_id, email, phone_number, hashedPassword],
          (err, result) => {
            if (err) {
              log('Error inserting service provider:', err);
              return res.status(500).json({ error: 'Database insertion failed' });
            }
            res.status(201).json({ message: 'Service provider registered successfully' });
          }
        );
      } catch (error) {
        log('Error hashing password:', error);
        res.status(500).json({ error: 'Server error' });
      }
    }
  );
});

// ✅ SERVICE PROVIDER SIGNIN API
app.post('/service-provider/signin', (req, res) => {
  const { email, password } = req.body;

  // Validate required fields
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  db.query('SELECT * FROM service_providers WHERE email = ?', [email], async (err, results) => {
    if (err) {
      log('Error in service provider signin query:', err);
      return res.status(500).json({ error: 'Database query failed' });
    }

    if (results.length === 0) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const serviceProvider = results[0];

    try {
      // Check password
      const isMatch = await bcrypt.compare(password, serviceProvider.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid email or password' });
      }

      // Generate token
      const token = jwt.sign(
        { 
          id: serviceProvider.id, 
          email: serviceProvider.email, 
          service_id: serviceProvider.service_id,
          type: 'service_provider'
        }, 
        JWT_SECRET, 
        { expiresIn: '1h' }
      );

      res.json({ 
        message: 'Service provider login successful', 
        token,
        user: {
          id: serviceProvider.id,
          service_id: serviceProvider.service_id,
          email: serviceProvider.email,
          phone_number: serviceProvider.phone_number,
          type: 'service_provider'
        }
      });
    } catch (error) {
      log('Error comparing password:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });
});

// ✅ CUSTOMER SIGNUP API
app.post('/customer/signup', (req, res) => {
  const { name, email, phone, password } = req.body;

  // Validate required fields
  if (!name || !email || !phone || !password) {
    return res.status(400).json({ message: 'All fields are required: name, email, phone, password' });
  }

  // Check if customer already exists
  db.query('SELECT * FROM customers WHERE email = ?', [email], async (err, results) => {
    if (err) {
      log('Error in customer signup query:', err);
      return res.status(500).json({ error: 'Database query failed' });
    }

    if (results.length > 0) {
      return res.status(400).json({ message: 'Customer with this email already exists' });
    }

    try {
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert new customer
      db.query(
        'INSERT INTO customers (name, email, phone, password) VALUES (?, ?, ?, ?)',
        [name, email, phone, hashedPassword],
        (err, result) => {
          if (err) {
            log('Error inserting customer:', err);
            return res.status(500).json({ error: 'Database insertion failed' });
          }
          res.status(201).json({ message: 'Customer registered successfully' });
        }
      );
    } catch (error) {
      log('Error hashing password:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });
});

// ✅ CUSTOMER SIGNIN API
app.post('/customer/signin', (req, res) => {
  const { email, password } = req.body;

  // Validate required fields
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  db.query('SELECT * FROM customers WHERE email = ?', [email], async (err, results) => {
    if (err) {
      log('Error in customer signin query:', err);
      return res.status(500).json({ error: 'Database query failed' });
    }

    if (results.length === 0) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const customer = results[0];

    try {
      // Check password
      const isMatch = await bcrypt.compare(password, customer.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid email or password' });
      }

      // Generate token
      const token = jwt.sign(
        { 
          id: customer.id, 
          email: customer.email,
          type: 'customer'
        }, 
        JWT_SECRET, 
        { expiresIn: '1h' }
      );

      res.json({ 
        message: 'Customer login successful', 
        token,
        user: {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          type: 'customer'
        }
      });
    } catch (error) {
      log('Error comparing password:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });
});

// ✅ Authentication middleware (optional - for protected routes)
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// ✅ Protected route example
app.get('/profile', authenticateToken, (req, res) => {
  const { type } = req.user;
  const tableName = type === 'service_provider' ? 'service_providers' : 'customers';
  
  db.query(`SELECT * FROM ${tableName} WHERE id = ?`, [req.user.id], (err, results) => {
    if (err) {
      log('Error fetching user profile:', err);
      return res.status(500).json({ error: 'Database query failed' });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = results[0];
    // Remove password from response
    delete user.password;
    
    res.json({ user });
  });
});

// ✅ Start server
const PORT = 5000;
app.listen(PORT, () => {
  log(`Server is running on http://localhost:${PORT}`);
});