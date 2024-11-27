document.addEventListener('DOMContentLoaded', () => {
  const purchaseData = JSON.parse(sessionStorage.getItem('purchaseData'));

  if (!purchaseData) {
    alert('수정할 데이터가 없습니다.');
    window.location.href = 'mypage.html';
    return;
  }

  document.getElementById('supplier-name').value = purchaseData.supplierName;
  document.getElementById('purchase-date').value = purchaseData.purchaseDate;

  const productsContainer = document.getElementById('products-container');
  productsContainer.innerHTML = '';

  purchaseData.products.forEach((product) => {
    const productHTML = `
      <div class="product">
        <div class="form-row">
          <label for="product-name">상품명</label>
          <input type="text" class="product-name" value="${product.product_name}" required>
        </div>
        <div class="form-row">
          <label for="product-price">단가</label>
          <input type="text" class="product-price" value="${product.product_price}" required>
        </div>
        <div class="form-row">
          <label for="quantity">수량</label>
          <input type="text" class="quantity" value="${product.quantity}" required>
        </div>
        <div class="form-row">
          <label for="total-price">금액</label>
          <input type="text" class="total-price" value="${product.quantity * product.product_price}" readonly>
        </div>
        <div class="form-row">
          <label for="reserved-quantity">미송 수량</label>
          <input type="text" class="reserved-quantity" value="${product.reserved_quantity}" required>
        </div>
        <button class="delete">×</button>
      </div>
    `;
    productsContainer.insertAdjacentHTML('beforeend', productHTML);
  });

  const updateTotalPrice = (productElement) => {
    const productPrice = parseFloat(productElement.querySelector(".product-price").value) || 0;
    const quantity = parseFloat(productElement.querySelector(".quantity").value) || 0;
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

  const products = document.querySelectorAll("#products-container .product");
  products.forEach((product) => attachListenersToProduct(product));

  document.getElementById('add').addEventListener('click', (event) => {
    event.preventDefault();

    const newProductHTML = `
      <div class="product">
        <div class="form-row">
          <label for="product-name">상품명</label>
          <input type="text" class="product-name" value="" required>
        </div>
        <div class="form-row">
          <label for="product-price">단가</label>
          <input type="text" class="product-price" value="" required>
        </div>
        <div class="form-row">
          <label for="quantity">수량</label>
          <input type="text" class="quantity" value="" required>
        </div>
        <div class="form-row">
          <label for="total-price">금액</label>
          <input type="text" class="total-price" value="" readonly>
        </div>
        <div class="form-row">
          <label for="reserved-quantity">미송 수량</label>
          <input type="text" class="reserved-quantity" value="" required>
        </div>
        <button class="delete">×</button>
      </div>
    `;
    productsContainer.insertAdjacentHTML('beforeend', newProductHTML);

    const newProduct = productsContainer.lastElementChild;
    attachListenersToProduct(newProduct);
    updateSummary();
  });

  updateSummary();

  document.getElementById('complete').addEventListener('click', async (event) => {
    event.preventDefault();

    const updatedSupplierName = document.getElementById('supplier-name').value;
    const updatedPurchaseDate = document.getElementById('purchase-date').value;

    const updatedProducts = Array.from(document.querySelectorAll('.product')).map((product) => ({
      productName: product.querySelector('.product-name').value,
      productPrice: parseFloat(product.querySelector('.product-price').value),
      quantity: parseInt(product.querySelector('.quantity').value),
      reservedQuantity: parseInt(product.querySelector('.reserved-quantity').value),
    }));

    try {
      const response = await fetch(`http://localhost:3000/api/edit-purchase/${purchaseData.purchaseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          supplierName: updatedSupplierName,
          purchaseDate: updatedPurchaseDate,
          products: updatedProducts,
        }),
      });

      if (!response.ok) {
        throw new Error('수정 실패');
      }

      alert('수정이 완료되었습니다.');
      window.location.href = 'mypage.html';
    } catch (error) {
      console.error('Error updating purchase:', error);
      alert('수정 중 오류가 발생했습니다.');
    }
  });
});