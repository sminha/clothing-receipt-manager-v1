const cors = require('cors')
const mysql = require('mysql2')
const bcrypt = require('bcrypt')
const express = require('express')
const jwt = require('jsonwebtoken')
const app = express()
const port = 3000

require('dotenv').config()

app.use(cors())
app.use(express.json())

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
}).promise();

console.log('Successfully connected to MySQL')

app.post('/api/signup', async (req, res) => {
  const { name, id, password, confirmPassword } = req.body

  if (!name || !id || !password || !confirmPassword) {
    return res.status(400).json({ message: '입력되지 않은 필드가 존재합니다.' })
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ message: '패스워드가 일치하지 않습니다.' })
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10)
    const query = 'INSERT INTO users (store_name, user_name, password) VALUES (?, ?, ?)'

    db.query(query, [name, id, hashedPassword], (err, result) => { 
      if (err) {
        console.error('Failed to save to the database:', err)
        return res.status(500).json({ message: '회원가입에 실패하였습니다.' })
      }

      res.status(201).json({ message: '회원가입이 완료되었습니다.' })
    })
  } catch (err) {
    console.error('Failed to encrypt the password:', err)
    res.status(500).json({ message: '회원가입에 실패하였습니다.' }) 
  }
})

app.post('/api/login', async (req, res) => {
  const { id, password } = req.body

  if (!id || !password) {
    return res.status(400).json({ message: '입력되지 않은 필드가 존재합니다.' })
  }

  try {
    const query = 'SELECT * FROM users WHERE user_name = ?'
    const [results] = await db.query(query, [id])

    if (results.length === 0) {
      return res.status(401).json({ message: '아이디 또는 비밀번호가 존재하지 않습니다.' })
    }

    const user = results[0]
    const isMatch = await bcrypt.compare(password, user.password)

    if (!isMatch) {
      return res.status(401).json({ message: '아이디 또는 비밀번호가 존재하지 않습니다.' })
    }

    const token = jwt.sign({ id: user.id, name: user.name }, process.env.SECRET_KEY, { expiresIn: '1h' }) 

    res.status(200).json({
      message: '로그인이 완료되었습니다.',
      token,  
    })

  } catch (err) {
    console.error('Failed to login:', err)
    res.status(500).json({ message: '로그인에 실패하였습니다.' })
  }
})

const tokenBlacklist = new Set()

app.post('/api/logout', async (req, res) => {
  try {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1] 

    if (!token) {
      return res.status(401).json({ message: '토큰이 제공되지 않았습니다.' })
    }

    jwt.verify(token, process.env.SECRET_KEY, (err, user) => {
      if (err) {
        return res.status(403).json({ message: '유효하지 않은 토큰입니다.' })
      }

      tokenBlacklist.add(token)

      res.status(200).json({ message: '로그아웃이 완료되었습니다.' })
    })
  } catch (err) {
    console.error('Failed to logout:', err)
    res.status(500).json({ message: '로그아웃에 실패하였습니다.' })
  }
})

app.listen(port, () => console.log(`Server is running on port ${port}`))