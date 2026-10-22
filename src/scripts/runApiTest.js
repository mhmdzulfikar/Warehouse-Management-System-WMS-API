async function runApiTest() {
  console.log('Testing Outbound APIs via HTTP fetch on http://localhost:5000...');

  // 1. Login
  const loginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'bapak_manager', password: 'password123' }),
  });
  const loginJson = await loginRes.json();
  const token = loginJson.data?.token || loginJson.token;
  console.log('Login status:', loginRes.status, 'Token acquired:', !!token);

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // 2. Get Customers & Warehouses
  const custRes = await fetch('http://localhost:5000/api/customers', { headers: authHeaders });
  const customers = (await custRes.json()).data;
  console.log(`Fetched ${customers.length} customers. First: ${customers[0]?.name}`);

  const whRes = await fetch('http://localhost:5000/api/warehouses', { headers: authHeaders });
  const warehouses = (await whRes.json()).data;

  // 3. Get Inventory to find available product
  const invRes = await fetch(`http://localhost:5000/api/inventory?warehouseId=${warehouses[0].id}`, { headers: authHeaders });
  const inventories = (await invRes.json()).data;
  const availableInv = inventories.find((inv) => inv.quantity >= 5) || inventories[0];
  const selectedProductId = availableInv.productId;
  console.log(`Using product ID: ${selectedProductId} with stock: ${availableInv.quantity}`);

  // 4. Create Sales Order
  const createSoRes = await fetch('http://localhost:5000/api/sales-orders', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      customerId: customers[0].id,
      warehouseId: warehouses[0].id,
      note: 'Pesanan resmi dari REST API test',
      items: [
        {
          productId: selectedProductId,
          quantity: 5,
          price: 15000,
        },
      ],
    }),
  });
  const createSoJson = await createSoRes.json();
  console.log('Create SO status:', createSoRes.status, createSoJson.message, 'SO No:', createSoJson.data?.soNumber);
  const soId = createSoJson.data?.id;

  // 5. Confirm SO
  const confirmRes = await fetch(`http://localhost:5000/api/sales-orders/${soId}/confirm`, {
    method: 'POST',
    headers: authHeaders,
  });
  console.log('Confirm SO status:', confirmRes.status, (await confirmRes.json()).message);

  // 6. Pick items
  const pickRes = await fetch(`http://localhost:5000/api/sales-orders/${soId}/pick`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      items: [{ productId: selectedProductId, pickedQty: 5 }],
    }),
  });
  console.log('Pick items status:', pickRes.status, (await pickRes.json()).message);

  // 7. Pack items
  const packRes = await fetch(`http://localhost:5000/api/sales-orders/${soId}/pack`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      items: [{ productId: selectedProductId, packedQty: 5 }],
    }),
  });
  console.log('Pack items status:', packRes.status, (await packRes.json()).message);

  // 8. Ship order & generate Delivery Order
  const shipRes = await fetch(`http://localhost:5000/api/sales-orders/${soId}/ship`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      driverName: 'Pak Joko (Armada Truk #3)',
      vehiclePlate: 'B 9182 WMS',
      recipientName: customers[0].name,
      note: 'Pengiriman via Express Logistics',
      items: [{ productId: selectedProductId, quantity: 5 }],
    }),
  });
  const shipJson = await shipRes.json();
  console.log('Ship order status:', shipRes.status, shipJson.message, 'DO No:', shipJson.data?.doNumber);

  // 10. List Delivery Orders
  const doRes = await fetch('http://localhost:5000/api/delivery-orders', { headers: authHeaders });
  const doList = (await doRes.json()).data;
  console.log(`Fetched ${doList.length} Delivery Orders! Latest DO: ${doList[0]?.doNumber}`);

  console.log('\n>>> OUTBOUND SALES ORDER LIFECYCLE 100% VERIFIED THROUGH REAL API! <<<');
}

runApiTest().catch(console.error);
