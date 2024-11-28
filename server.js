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
  const { name, id, password, confirmPassword, userType } = req.body

  if (!name || !id || !password || !confirmPassword || !userType) {
    return res.status(400).json({ message: '입력되지 않은 필드가 존재합니다.' })
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ message: '패스워드가 일치하지 않습니다.' })
  }

  try {
    const checkQuery = 'SELECT * FROM ?? WHERE user_name = ?';
    const tableName = userType === 'retail' ? 'retails' : 'wholesales';
    const [existingUser] = await db.query(checkQuery, [tableName, id]);

    if (existingUser.length > 0) {
      return res.status(409).json({ message: '이미 존재하는 아이디입니다.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const insertQuery = userType === 'retail'
      ? 'INSERT INTO retails (retail_name, user_name, password) VALUES (?, ?, ?)'
      : 'INSERT INTO wholesales (wholesale_name, user_name, password) VALUES (?, ?, ?)';
    await db.query(insertQuery, [name, id, hashedPassword]);

    res.status(201).json({ message: '회원가입이 완료되었습니다.' });
  } catch (err) {
    console.error('Failed to sign up:', err);
    res.status(500).json({ message: '회원가입에 실패하였습니다.' });
  }
})

app.post('/api/login', async (req, res) => {
  const { userType, id, password } = req.body

  if (!userType || !id || !password) {
    return res.status(400).json({ message: '입력되지 않은 필드가 존재합니다.' })
  }

  let query;

  if (userType === 'wholesale') {
    query = 'SELECT * FROM wholesales WHERE user_name = ?';
  } else if (userType === 'retail') {
    query = 'SELECT * FROM retails WHERE user_name = ?';
  } else {
    return res.status(400).json({ message: '잘못된 사용자 유형입니다.' });
  }

  try {
    const [results] = await db.query(query, [id])

    if (results.length === 0) {
      return res.status(401).json({ message: '아이디 또는 비밀번호가 존재하지 않습니다.' })
    }

    const user = results[0]
    const isMatch = await bcrypt.compare(password, user.password)

    if (!isMatch) {
      return res.status(401).json({ message: '아이디 또는 비밀번호가 존재하지 않습니다.' })
    }

    const token = jwt.sign({ id: user.id, name: userType === 'wholesale' ? user.wholesale_name : user.retail_name, userType }, process.env.SECRET_KEY, { expiresIn: '1h' }) 

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

app.post("/api/add-purchase", async (req, res) => {
  const { supplierName, purchaseDate, products } = req.body;

  if (!supplierName || !purchaseDate || !products || products.length === 0) {
    return res.status(400).json({ message: "입력된 데이터가 유효하지 않습니다." });
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; 

    if (!token) {
      return res.status(401).json({ message: '토큰이 제공되지 않았습니다.' });
    }

    const decoded = jwt.verify(token, process.env.SECRET_KEY); 
    const userId = decoded.id;

    const [supplier] = await connection.query(
      "SELECT id FROM suppliers WHERE supplier_name = ?",
      [supplierName]
    );

    let supplierId;
    if (supplier.length === 0) {
      const [result] = await connection.query(
        "INSERT INTO suppliers (supplier_name) VALUES (?)",
        [supplierName]
      );
      supplierId = result.insertId;
    } else {
      supplierId = supplier[0].id;
    }

    const [purchase] = await connection.query(
      "INSERT INTO purchases (user_id, supplier_id, purchase_date) VALUES (?, ?, ?)",
      [userId, supplierId, purchaseDate]
    );
    const purchaseId = purchase.insertId;

    for (const product of products) {
      const { productName, productPrice, quantity, reservedQuantity } = product;

      const [oldProducts] = await connection.query(
        "SELECT id FROM products WHERE product_name = ? AND supplier_id = ?",
        [productName, supplierId]
      );

      let productId;
      if (oldProducts.length === 0) {
        const [newProduct] = await connection.query(
          "INSERT INTO products (supplier_id, product_name, product_price) VALUES (?, ?, ?)",
          [supplierId, productName, productPrice]
        );
        productId = newProduct.insertId;
      } else {
        productId = oldProducts[0].id;
      }

      await connection.query(
        "INSERT INTO purchases_products (purchase_id, product_id, quantity, reserved_quantity) VALUES (?, ?, ?, ?)",
        [purchaseId, productId, quantity, reservedQuantity]
      );
    }

    await connection.commit();

    res.status(201).json({ message: "사입 내역이 성공적으로 저장되었습니다." });
    } catch (error) {
    console.error(error);
    res.status(500).json({ message: "사입 내역 저장 중 오류가 발생했습니다." });
    } finally {
    connection.release();
    }
});

app.get('/api/mypage', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: '토큰이 제공되지 않았습니다.' });
    }

    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    const userId = decoded.id;

    const [userResult] = await db.query('SELECT store_name FROM users WHERE id = ?', [userId]);

    if (userResult.length === 0) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    const storeName = userResult[0].store_name;

    const [ordersResult] = await db.query(`
      SELECT 
        p.id AS purchaseId,
        s.supplier_name AS supplierName,
        p.purchase_date AS purchaseDate,
        COUNT(pp.product_id) AS totalProducts,
        SUM(pp.quantity) AS totalQuantity,
        SUM(pp.quantity * pr.product_price) AS totalPrice,
        SUM(pp.reserved_quantity) AS totalReserved
      FROM purchases p
      JOIN suppliers s ON p.supplier_id = s.id
      JOIN purchases_products pp ON p.id = pp.purchase_id
      JOIN products pr ON pp.product_id = pr.id
      WHERE p.user_id = ?
      GROUP BY p.id, s.supplier_name, p.purchase_date
      ORDER BY p.purchase_date DESC
    `, [userId]);

    res.status(200).json({
      storeName,
      orders: ordersResult,
    });
  } catch (error) {
    console.error('Failed to fetch mypage data:', error);
    res.status(500).json({ message: '마이페이지 데이터를 가져오는 중 오류가 발생했습니다.' });
  }
});

const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  jwt.verify(token, process.env.SECRET_KEY, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    req.user = user;
    next();
  });
};

app.get('/api/view-purchase/:purchaseId', authenticateToken, async (req, res) => {
  const { purchaseId } = req.params;

  try {
    const purchaseQuery = `
      SELECT p.id AS purchaseId, p.purchase_date, s.supplier_name
      FROM purchases p
      JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.id = ?
    `;
    const [purchaseResult] = await db.query(purchaseQuery, [purchaseId]);

    if (!purchaseResult || purchaseResult.length === 0) {
      return res.status(404).json({ message: 'Purchase not found' });
    }

    const purchase = purchaseResult[0];

    const productsQuery = `
      SELECT pr.product_name, pr.product_price, pp.quantity, 
             (pr.product_price * pp.quantity) AS total_price, pp.reserved_quantity
      FROM purchases_products pp
      JOIN products pr ON pp.product_id = pr.id
      WHERE pp.purchase_id = ?
    `;
    const [productsResult] = await db.query(productsQuery, [purchaseId]);

    const totalProducts = productsResult.length;
    const totalQuantity = productsResult.reduce((acc, product) => acc + product.quantity, 0);
    const totalPrice = productsResult.reduce((acc, product) => acc + product.total_price, 0);
    const totalReservedQuantity = productsResult.reduce((acc, product) => acc + product.reserved_quantity, 0);

    const responseData = {
      supplierName: purchase.supplier_name,
      purchaseDate: purchase.purchase_date,
      products: productsResult,
      totalProducts,
      totalQuantity,
      totalPrice,
      totalReservedQuantity,
    };

    res.json(responseData);
  } catch (error) {
    console.error('Error fetching purchase details:', error);
    res.status(500).json({ message: '서버에서 오류가 발생했습니다.' });
  }
});

app.put('/api/edit-purchase/:purchaseId', authenticateToken, async (req, res) => {
  const { purchaseId } = req.params;
  const { supplierName, purchaseDate, products } = req.body;

  if (!supplierName || !purchaseDate || !products || products.length === 0) {
    return res.status(400).json({ message: '입력된 데이터가 유효하지 않습니다.' });
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const decoded = req.user;
    const userId = decoded.id;

    const [purchaseResult] = await connection.query(
      `SELECT id, supplier_id FROM purchases WHERE id = ? AND user_id = ?`,
      [purchaseId, userId]
    );

    if (purchaseResult.length === 0) {
      return res.status(404).json({ message: '수정할 구매 내역을 찾을 수 없습니다.' });
    }

    const supplierId = purchaseResult[0].supplier_id;

    await connection.query(
      `UPDATE suppliers SET supplier_name = ? WHERE id = ?`,
      [supplierName, supplierId]
    );

    await connection.query(
      `UPDATE purchases SET purchase_date = ? WHERE id = ?`,
      [purchaseDate, purchaseId]
    );

    const [deletedProducts] = await connection.query(
      `SELECT pp.product_id FROM purchases_products pp 
       WHERE pp.purchase_id = ?`,
      [purchaseId]
    );

    await connection.query(
      `DELETE FROM purchases_products WHERE purchase_id = ?`,
      [purchaseId]
    );

    for (const { product_id } of deletedProducts) {
      const [productUsageCount] = await connection.query(
        `SELECT COUNT(*) AS usage_count FROM purchases_products WHERE product_id = ?`,
        [product_id]
      );

      if (productUsageCount[0].usage_count === 0) {
        await connection.query(
          `DELETE FROM products WHERE id = ?`,
          [product_id]
        );
      }
    }

    for (const product of products) {
      const { productId, productName, productPrice, quantity, reservedQuantity } = product;

      let existingProduct = await connection.query(
        `SELECT id FROM products WHERE product_name = ? AND supplier_id = ?`,
        [productName, supplierId]
      );

      if (productId) {
        await connection.query(
          `UPDATE products 
           SET product_name = ?, product_price = ? 
           WHERE id = ? AND supplier_id = ?`,
          [productName, productPrice, productId, supplierId]
        );
      } else {
        if (existingProduct[0].length === 0) {
          const [newProduct] = await connection.query(
            `INSERT INTO products (supplier_id, product_name, product_price) 
             VALUES (?, ?, ?)`,
            [supplierId, productName, productPrice]
          );
          product.productId = newProduct.insertId;
        } else {
          product.productId = existingProduct[0][0].id;
        }
      }

      await connection.query(
        `INSERT INTO purchases_products (purchase_id, product_id, quantity, reserved_quantity) 
         VALUES (?, ?, ?, ?)`,
        [purchaseId, product.productId, quantity, reservedQuantity]
      );
    }

    await connection.commit();
    res.status(200).json({ message: '구매 내역이 성공적으로 수정되었습니다.' });
  } catch (error) {
    console.error('Error updating purchase:', error);
    await connection.rollback();
    res.status(500).json({ message: '수정 중 오류가 발생했습니다.' });
  } finally {
    connection.release();
  }
});

app.delete('/api/delete-purchase/:purchaseId', authenticateToken, async (req, res) => {
  const purchaseId = req.params.purchaseId;

  try {
    const purchase = await db.query('DELETE FROM purchases WHERE id = ?', [purchaseId]);
    
    if (purchase.affectedRows === 0) {
      return res.status(404).json({ message: '주문을 찾을 수 없습니다.' });
    }

    res.status(200).json({ message: '주문이 삭제되었습니다.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

app.listen(port, () => console.log(`Server is running on port ${port}`))