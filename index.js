const express = require('express');
const rateLimit = require('express-rate-limit');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const app = express();

app.use(express.json());

// Rate limiter for product-related routes
const productRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
});

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET){
    console.error("Missing token in environment variable")
    process.exit(1)
}

async function initializeDatabase (){
   try{
    const connection = await mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        connectTimeout: 10000
    });
    // Users table
    await connection.execute(
        `CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        isAdmin BOOLEAN DEFAULT FALSE
        )`
    );

    // Products table
    await connection.execute(
        `CREATE TABLE IF NOT EXISTS products (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            price DECIMAL(10, 2) NOT NULL,
            stock INT NOT NULL,
            image_url VARCHAR(255)
        )`
    );

    // Cart table
    await connection.execute(
        `CREATE TABLE IF NOT EXISTS cart (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            product_id INT NOT NULL,
            quantity INT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
        )`
    );

    // Orders table
    await connection.execute(
        `CREATE TABLE IF NOT EXISTS orders (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            total DECIMAL(10, 2) NOT NULL,
            status ENUM('pending', 'completed', 'cancelled') DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )`
    );

    // Order items table
    await connection.execute(
        `CREATE TABLE IF NOT EXISTS order_items (
            id INT AUTO_INCREMENT PRIMARY KEY,
            order_id INT NOT NULL,
            product_id INT NOT NULL,
            quantity INT NOT NULL,
            price_at_purchase DECIMAL(10, 2) NOT NULL,
            FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
        )`
    );

    await connection.end();
    console.log('Database initialized')
}catch (error){
    console.error("Database connection error:", error);
}
}

initializeDatabase().catch(console.error);

function authenticateToken(req, res, next){
    console.log('🔍 Checking Authorization Header:', req.headers.authorization);
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")){
        console.log('❌ No token provided');
        return res.status(403).send('No token provided.')
    }

    token = authHeader.split(" ")[1]

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if(err){
            console.log('❌ Invalid token:', err);
            return res,status(403).send('Invalid or expired token');
        }
        req.user = user; // Contains { id, username, isAdmin }
        next();
    })
}

const rateLimiter = rateLimit({
    windows: 5 * 60 * 1000, // 15 minutes
    max: 20, // Limit to 5 attempts per window
    message: 'Too many attempts. Try again later.',
    headers: true // Include rate limit info in the response headers
})

// Endpoints
app.delete("/unregister", rateLimiter, authenticateToken, async(req, res) => {
    console.log('📢 Unregister request received for user:', req.user);
    try{
            const connection = await mysql.createConnection({
                host: process.env.MYSQL_HOST,
                user: process.env.MYSQL_USER,
                password: process.env.MYSQL_PASSWORD,
                database: process.env.MYSQL_DATABASE
            });
            console.log('✅ Connected to database');
            const [result] = await connection.execute(
                'DELETE FROM users WHERE id = ?',
                [req.user.id]
            );
            await connection.end();

            if (result.affectedRows === 0){
                console.log('❌ No user deleted, user not found.');
                return res.status(404).send('User not found')
            }
            console.log('✅ User deleted successfully');
            res.status(200).send('User deleted successfully.')
    } catch(error){
        console.error('❌ Error deleting user:', error);
        res.status(500).send('Error deleteing user')
    }
})

app.post('/register', rateLimiter, async(req, res) => {
    let { username , password, isAdmin } = req.body;
    if (!username || !password){
        return res.status(400).send('Username and Password are required');
    }
    // Default to false if isAdmin is not provided
    isAdmin = isAdmin === true; // Ensure isAdmin is a boolean (true or false)

    const hashedPassword = await bcrypt.hash(password, 10);
    try{
        const connection = await mysql.createConnection({
            host: process.env.MYSQL_HOST,
            user: process.env.MYSQL_USER,
            password: process.env.MYSQL_PASSWORD,
            database: process.env.MYSQL_DATABASE
        });
        await connection.execute(
            'INSERT INTO users (username, password, isAdmin) VALUES (?,?,?)',
            [username, hashedPassword, isAdmin]
        );
        await connection.end();
        res.status(201).send('User registered');
    }catch (error){
        if (error.code == 'ER_DUP_ENTRY'){
            res.status(409).send('Username already exists');
        } else{
            res.status(500).send('Error registering user');
        } 
    }
});

app.post('/login', rateLimiter , async (req, res) => {
    const {username, password} = req.body;
    try {
        const connection = await mysql.createConnection({
            host: process.env.MYSQL_HOST,
            user: process.env.MYSQL_USER,
            password: process.env.MYSQL_PASSWORD,
            database: process.env.MYSQL_DATABASE
        });
        const [rows] = await connection.execute(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );
        await connection.end();
        if (rows.length === 0){
            return res.status(401).send('Invalid username or password');
        }
        const user = rows[0];
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid){
            return res.status(401).send('Invalid username or password')
        }
        const token = jwt.sign({id: user.id, username: user.username, isAdmin: user.isAdmin}, JWT_SECRET, {expiresIn: '1h'});
        res.json({ token });
    } catch (error) {
        res.status(500).send('Error logging in');
    }
});

// Get all products
app.get('/products', rateLimiter, async (req, res) => {
    try {
        const connection = await mysql.createConnection({
            host: process.env.MYSQL_HOST,
            user: process.env.MYSQL_USER,
            password: process.env.MYSQL_PASSWORD,
            database: process.env.MYSQL_DATABASE
        });
        console.log('✅ Connected to database for get products.');
        const [rows] = await connection.execute('SELECT * FROM products');
        await connection.end();
        console.log('✅ Returned rows.');
        res.json(rows);
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).send('Error fetching products');
    }
});

// Add role-based middleware for admin routes
function isAdmin(req, res, next) {
    if (!req.user.isAdmin) {
        return res.status(403).send('Admin access required');
    }
    next();
}

// Add product (admin-only)
app.post('/products', productRateLimiter, authenticateToken, isAdmin, async (req, res) => {
    console.log('✅ Start add products.');
    const { name, description, price, stock, image_url } = req.body;
    if (!name || !price || !stock) {
        return res.status(400).send('Name, price, and stock are required');
    }
    try {
        const connection = await mysql.createConnection({
            host: process.env.MYSQL_HOST,
            user: process.env.MYSQL_USER,
            password: process.env.MYSQL_PASSWORD,
            database: process.env.MYSQL_DATABASE
        });
        console.log('✅ Connected to database to add products.');
        await connection.execute(
            'INSERT INTO products (name, description, price, stock, image_url) VALUES (?, ?, ?, ?, ?)',
            [name, description, price, stock, image_url]
        );
        await connection.end();
        console.log('✅ Product added.');
        res.status(201).send('Product added');
    } catch (error) {
        console.error('Error adding product:', error);
        res.status(500).send('Error adding product');
    }
});

// Get user's cart
app.get('/cart', authenticateToken, rateLimiter, async (req, res) => {
    try {
        const connection = await mysql.createConnection({
            host: process.env.MYSQL_HOST,
            user: process.env.MYSQL_USER,
            password: process.env.MYSQL_PASSWORD,
            database: process.env.MYSQL_DATABASE
        });
        const [rows] = await connection.execute(
            'SELECT c.id, c.product_id, c.quantity, p.name, p.price FROM cart c JOIN products p ON c.product_id = p.id WHERE c.user_id = ?',
            [req.user.id]
        );
        await connection.end();
        res.json(rows);
    } catch (error) {
        console.error('Error fetching cart:', error);
        res.status(500).send('Error fetching cart');
    }
});

// Add item to cart
app.post('/cart', authenticateToken, rateLimiter, async (req, res) => {
    const { product_id, quantity } = req.body;
    if (!product_id || !quantity || quantity <= 0) {
        return res.status(400).send('Product ID and valid quantity are required');
    }
    try {
        const connection = await mysql.createConnection({
            host: process.env.MYSQL_HOST,
            user: process.env.MYSQL_USER,
            password: process.env.MYSQL_PASSWORD,
            database: process.env.MYSQL_DATABASE
        });
        const [products] = await connection.execute('SELECT stock FROM products WHERE id = ?', [product_id]);
        if (products.length === 0 || products[0].stock < quantity) {
            await connection.end();
            return res.status(400).send('Product not found or insufficient stock');
        }
        await connection.execute(
            'INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE quantity = quantity + ?',
            [req.user.id, product_id, quantity, quantity]
        );
        await connection.end();
        res.status(201).send('Item added to cart');
    } catch (error) {
        console.error('Error adding to cart:', error);
        res.status(500).send('Error adding to cart');
    }
});

app.listen(3000, '0.0.0.0', () => {
    console.log('Server running on port 3000.')
})
