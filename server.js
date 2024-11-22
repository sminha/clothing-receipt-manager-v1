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

app.listen(port, () => console.log(`Server is running on port ${port}`))