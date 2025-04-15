const express = require('express');
const rateLimit = require('express-rate-limit');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const app = express();

app.use(express.json());

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
        password VARCHAR(255) NOT NULL)`
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
        req.user = user;
        next();
    })
}

const rateLimiter = rateLimit({
    windows: 5 * 60 * 1000, // 15 minutes
    max: 10, // Limit to 5 attempts per window
    message: 'Too many attempts. Try again later.',
    headers: true // Include rate limit info in the response headers
})

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
    let { username , password } = req.body;
    if (!username || !password){
        return res.status(400).send('Username and Password are required');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    try{
        const connection = await mysql.createConnection({
            host: process.env.MYSQL_HOST,
            user: process.env.MYSQL_USER,
            password: process.env.MYSQL_PASSWORD,
            database: process.env.MYSQL_DATABASE
        });
        await connection.execute(
            'INSERT INTO users (username, password) VALUES (?,?)',
            [username, hashedPassword]
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
        const token = jwt.sign({id: user.id, username: user.username}, JWT_SECRET, {expiresIn: '1h'});
        res.json({ token });
    } catch (error) {
        res.status(500).send('Error logging in');
    }
});


app.listen(3000, '0.0.0.0', () => {
    console.log('Server running on port 3000.')
})
