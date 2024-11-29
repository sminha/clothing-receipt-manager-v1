const form = document.getElementById("purchase");

const updateTotalPrice = (productElement) => {
  const productPrice = parseFloat(productElement.querySelector(".product-price").value.replace(/,/g, '')) || 0;
  const quantity = parseFloat(productElement.querySelector(".quantity").value.replace(/,/g, '')) || 0;
  const totalPriceField = productElement.querySelector(".total-price");

  const totalPrice = productPrice * quantity;
  totalPriceField.value = totalPrice.toLocaleString(); 
  updateSummary(); 
};

const attachListenersToProduct = (productElement) => {
  const productPriceInput = productElement.querySelector(".product-price");
  const quantityInput = productElement.querySelector(".quantity");
  const reservedQuantityInput = productElement.querySelector(".reserved-quantity"); 

  productPriceInput.addEventListener("input", () => updateTotalPrice(productElement));
  quantityInput.addEventListener("input", () => updateTotalPrice(productElement));
  reservedQuantityInput.addEventListener("input", () => updateSummary()); 

  const deleteButton = productElement.querySelector(".delete");
  deleteButton.addEventListener("click", (event) => {
    event.preventDefault();  
    productElement.remove(); 
    updateSummary();  
  });
};

const updateSummary = () => {
  const productElements = document.querySelectorAll("#products-container .product");
  let totalQuantity = 0;
  let totalPrice = 0;
  let totalReservedQuantity = 0;

  productElements.forEach((product) => {
    const quantity = parseInt(product.querySelector(".quantity").value) || 0;
    const total = parseFloat(product.querySelector(".total-price").value.replace(/,/g, '')) || 0;
    const reservedQuantity = parseInt(product.querySelector(".reserved-quantity").value) || 0;

    totalQuantity += quantity;
    totalPrice += total;
    totalReservedQuantity += reservedQuantity;
  });

  document.getElementById("sum2").innerText = `${productElements.length}건`;
  document.getElementById("sum3").innerText = `${totalQuantity}개`;
  document.getElementById("sum4").innerText = `${totalPrice.toLocaleString()}원`;
  document.getElementById("sum5").innerText = `${totalReservedQuantity}개`;
};

const productsContainer = document.getElementById("products-container");
const products = document.querySelectorAll("#products-container .product");
products.forEach((product) => attachListenersToProduct(product));

const addNewProduct = (item = null) => {
  const existingEmptyProduct = Array.from(
    document.querySelectorAll("#products-container .product")
  ).find((product) => {
    const productName = product.querySelector(".product-name").value.trim();
    const productPrice = product.querySelector(".product-price").value.trim();
    const quantity = product.querySelector(".quantity").value.trim();
    return !productName && !productPrice && !quantity; 
  });

  let productElement;

  if (existingEmptyProduct) {
    productElement = existingEmptyProduct;
  } else {
    const productHTML = `
      <div class="product">
        <div class="form-row">
          <label for="product-name">상품명</label>
          <input type="text" class="product-name" required>
        </div>
        <div class="form-row">
          <label for="product-price">단가</label>
          <input type="text" class="product-price" required>
        </div>
        <div class="form-row">
          <label for="quantity">수량</label>
          <input type="text" class="quantity" required>
        </div>
        <div class="form-row">
          <label for="total-price">금액</label>
          <input type="text" class="total-price" required readonly>
        </div>
        <div class="form-row">
          <label for="reserved-quantity">미송 수량</label>
          <input type="text" class="reserved-quantity" required>
        </div>
        <button class="delete">×</button>
      </div>
    `;

    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = productHTML;
    productElement = tempDiv.firstElementChild;

    const addButton = document.getElementById("add");
    productsContainer.insertBefore(productElement, addButton);
    attachListenersToProduct(productElement); 
  }

  if (item) {
    productElement.querySelector(".product-name").value = item.productName;
    productElement.querySelector(".product-price").value = item.productPrice;
    productElement.querySelector(".quantity").value = item.quantity;
    productElement.querySelector(".reserved-quantity").value = 0; 
    updateTotalPrice(productElement);
  }

  updateSummary();
};

const addButton = document.getElementById("add");
addButton.addEventListener("click", (event) => {
  event.preventDefault();
  addNewProduct();
});

form.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    form.dispatchEvent(new Event("submit")); 
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const supplierName = document.getElementById("supplier-name").value;
  const purchaseDate = document.getElementById("purchase-date").value;

  const products = [];
  const product = document.querySelectorAll("#products-container .product");

  product.forEach((product) => {
    const productName = product.querySelector(".product-name").value;
    const productPrice = product.querySelector(".product-price").value;
    const quantity = product.querySelector(".quantity").value;
    const reservedQuantity = product.querySelector(".reserved-quantity").value;

    products.push({ productName, productPrice, quantity, reservedQuantity });
  });

  const data = {
    supplierName,
    purchaseDate,
    products,
  };

  try {
    const token = localStorage.getItem("token");
    
    const response = await fetch("http://localhost:3000/api/add-purchase", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`, 
      },
      body: JSON.stringify(data),
    });

    const responseData = await response.json();

    if (response.ok) {
      alert(responseData.message);
      window.location.href = "mypage.html";
    } else if (response.status === 401 || response.status === 403) {
      alert("인증 정보가 유효하지 않습니다. 다시 로그인해주세요.");
      window.location.href = "login.html";
    } else {
      alert(responseData.message);
    }
  } catch (error) {
    console.error("Failed to add purchase:", error);
    alert("사입 내역 추가 중 문제가 발생하였습니다. 다시 시도해주세요.");
  }
});

const completeButton = document.getElementById("complete");

completeButton.addEventListener("click", (event) => {
  event.preventDefault();
  form.dispatchEvent(new Event("submit"));
});

function extractReceiptData(text) {
  const data = {
    purchaseDate: null,
    supplierName: null,
    items: []
  };

  const dateMatch = text.match(/\d{2}-\d{2}-\d{2}\(.*\)/);
  if (dateMatch) {
    const dateString = dateMatch[0].replace(/\(.*\)/, '').trim();
    const parts = dateString.split("-");
    const year = "20" + parts[0]; 
    const formattedDate = `${year}-${parts[1]}-${parts[2]}`;
    data.purchaseDate = formattedDate;
  }

  const supplierNameMatch = text.match(/\d{4}-\d{2}-\d{2}\(\)\s*\d{2}:\d{2}:\d{2}\s+([^\s]+)/);
  if (supplierNameMatch) {
    data.supplierName = supplierNameMatch[1]; 
  }

  const itemRegex = /([가-힣A-Za-z0-9/]+)\s+(\d{1,3}(?:,\d{3})*)\s+(\d+)\s+(\d{1,3}(?:,\d{3})*)/g;
  let match;
  while ((match = itemRegex.exec(text)) !== null) {
    const product = {
      productName: match[1],     
      productPrice: match[2],    
      quantity: match[3],        
      totalPrice: match[4]       
    };
    data.items.push(product);
  }

  return data;
}

const uploadForm = document.getElementById('uploadForm');

uploadForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const formData = new FormData();
  const fileInput = document.getElementById('fileInput');
  formData.append('image', fileInput.files[0]);

  try {
    const response = await fetch('http://localhost:3000/api/upload-image', {
      method: 'POST',
      body: formData,
    });
    const data = await response.json();

    if (response.ok) {
      console.log(extractReceiptData(data.detectedText))

      const receiptData = extractReceiptData(data.detectedText);
      document.getElementById('supplier-name').value = receiptData.supplierName; 
      document.getElementById('purchase-date').value = receiptData.purchaseDate; 

      receiptData.items.forEach(item => {
        addNewProduct(item); 

        const lastProduct = document.querySelector("#products-container .product:last-child");
        if (!lastProduct) {
          console.error("새로 추가된 제품을 찾을 수 없음");
          return;
        }

        lastProduct = document.querySelector("#products-container .product:last-child");
        lastProduct.querySelector(".product-name").value = item.productName;
        lastProduct.querySelector(".product-price").value = item.productPrice;
        lastProduct.querySelector(".quantity").value = item.quantity;
        lastProduct.querySelector(".reserved-quantity").value = 0; 
        updateTotalPrice(lastProduct);
        console.log(item.productName)
        console.log(item.productPrice)
      });
    } else {
      alert(`오류: ${data.message}`);
    }
  } catch (error) {
    console.error(error)
    alert('업로드 중 오류가 발생했습니다.');
  }
});