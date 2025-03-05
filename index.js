const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const app = express();

app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET;

async function initializeDatabase (){
    const connection = await mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE
    });
    await connection.execute(
        `CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL)`
    );
    await connection.end();
    console.log('Database initialized')
}

initializeDatabase().catch(console.error);

app.post('/register', async(req, res) => {
    const { username , password } = req.body;
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

//Logiin endpoint
app.post('/login', async (req, res) => {
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
