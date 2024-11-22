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

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
})

db.connect((err) => {
  if (err) {
    console.error('Failed to connect to MySQL:', err)
    return
  }
  console.log('Successfully connected to MySQL')
})

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

app.listen(port, () => console.log(`Server is running on port ${port}`))