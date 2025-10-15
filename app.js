// === Firebase (integración directa para GitHub Pages) ===
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, push, onValue, update, remove } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// Configuración de tu app Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDWMFZz89Q-Df2HkJGFyc1oJCffxcTSOyE",
  authDomain: "antojitosmx-fd172.firebaseapp.com",
  projectId: "antojitosmx-fd172",
  storageBucket: "antojitosmx-fd172.appspot.com",
  messagingSenderId: "491532667385",
  appId: "1:491532667385:web:3a4dddfca7db54e7e39528",
  measurementId: "G-887VLJ2FNP",
  databaseURL: "https://antojitosmx-fd172-default-rtdb.firebaseio.com"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ===== Utilidades =====
const $ = (s, r=document)=>r.querySelector(s);
const $$ = (s, r=document)=>Array.from(r.querySelectorAll(s));
const money = n => n.toLocaleString('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0});
const uid = () => 'FM-' + Math.random().toString(36).slice(2,6).toUpperCase();
const nowYear = ()=> new Date().getFullYear();

const LS = {
  get(k, d){ try{ return JSON.parse(localStorage.getItem(k) ?? 'null') ?? d }catch{ return d } },
  set(k, v){ localStorage.setItem(k, JSON.stringify(v)) },
  del(k){ localStorage.removeItem(k) }
};

// ===== Datos demo =====
const DEFAULT_MENU = [
  {id:'i1', name:'Tacos al pastor', price:12000, cat:'Tacos', tags:['picante'], img:'https://images.unsplash.com/photo-1608039829572-78524f77d8f0?q=80&w=1200&auto=format&fit=crop'},
  {id:'i2', name:'Quesadilla de pollo', price:15000, cat:'Quesadillas', tags:['grande'], img:'https://images.unsplash.com/photo-1625944525149-0e30b2ed88ea?q=80&w=1200&auto=format&fit=crop'},
  {id:'i3', name:'Burrito mixto', price:18000, cat:'Burritos', tags:['grande'], img:'https://images.unsplash.com/photo-1606756790138-261d2b21cd30?q=80&w=1200&auto=format&fit=crop'},
  {id:'i4', name:'Torta ahogada', price:14000, cat:'Tortas', tags:['picante'], img:'https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=1200&auto=format&fit=crop'},
  {id:'i5', name:'Tamales verdes', price:5000, cat:'Tamales', img:'https://images.unsplash.com/photo-1617242552612-3c7479b29215?q=80&w=1200&auto=format&fit=crop'},
  {id:'i6', name:'Agua de horchata', price:7000, cat:'Bebidas', img:'https://images.unsplash.com/photo-1524594154908-eddff0a67fa9?q=80&w=1200&auto=format&fit=crop'},
  {id:'i7', name:'Elote clásico', price:6000, cat:'Elotes & Esquites', tags:['sin gluten'], img:'https://images.unsplash.com/photo-1625944590007-80f94d55bd16?q=80&w=1200&auto=format&fit=crop'},
  {id:'i8', name:'Churros con canela', price:9000, cat:'Postres', tags:['dulce'], img:'https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?q=80&w=1200&auto=format&fit=crop'}
];

let MENU = LS.get('menuItems', null) || DEFAULT_MENU; LS.set('menuItems', MENU);
let ORDERS = LS.get('orders', []);
let USERS  = LS.get('users', []);   // [{name, phone, pass, usedWelcome}]
let SESSION = LS.get('session', {role:'guest', client:null}); // role: guest|client|worker

const state = { cat:'Todas', q:'', cart:[], coupon:{code:null, amount:0} };

// ===== Inicializar =====
function init(){
  $('#year').textContent = nowYear();

  // Tabs Cliente/Trabajador
  $('#btnTabCliente').onclick = ()=>switchView('clientView');
  $('#btnTabTrabajador').onclick = ()=>switchView('workerView');

  // Tabs de auth (cliente)
  $$('#accountBox .tabs button').forEach(b=>{
    b.addEventListener('click', ()=>{
      $$('#accountBox .tabs button').forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
      $('#panel-login').style.display = b.dataset.panel==='login'?'block':'none';
      $('#panel-register').style.display = b.dataset.panel==='register'?'block':'none';
    });
  });
  $('#btnToggleAccount').onclick = ()=>{
    const box = $('#accountBox');
    box.style.display = (box.style.display==='none' || !box.style.display) ? 'block' : 'none';
  };

  // Buscador
  $('#q').addEventListener('input', e=>{ state.q = e.target.value.toLowerCase(); renderMenu(); });
  $('#btnClear').onclick = ()=>{ $('#q').value=''; state.q=''; renderMenu(); };

  // Cliente: login / register / guest
  $('#btnClientLogin').onclick = clientLogin;
  $('#btnClientRegister').onclick = clientRegister;
  $('#btnLogoutClient').onclick = clientLogout;
  $('#btnGuest').onclick = ()=>{ SESSION={role:'guest', client:null}; LS.set('session',SESSION); hydrateClientUI(); };

  // Menú/seguimiento tabs
  $$('.tabs:not(.small) button').forEach(b=>{
    b.addEventListener('click', ()=>{
      $$('.tabs:not(.small) button').forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
      $('#panel-menu').style.display = b.dataset.panel==='menu'?'block':'none';
      $('#panel-seguimiento').style.display = b.dataset.panel==='seguimiento'?'block':'none';
    });
  });

  // Carrito & checkout
  $('#btnCheckout').onclick = ()=>{ const box=$('#checkoutBox'); box.style.display = box.style.display==='none'?'block':'none' };
  $('#btnPlace').onclick = placeOrder;
  $('#btnApplyCoupon').onclick = applyCoupon;

  // Tracking
  $('#btnTrack').onclick = ()=>{
    const code = $('#trackId').value.trim();
    const o = ORDERS.find(x=>x.id===code);
    $('#trackResult').innerHTML = o ? `<div class="card"><b>Estado:</b> ${o.status.text}<br><span class="muted">Total: ${money(o.total)} • Cliente: ${o.customer.name}</span></div>` : '<p class="muted">No se encontró el pedido.</p>';
  };

  // Trabajador
  $('#btnLogin').onclick = workerLogin;
  $('#btnLogout').onclick = workerLogout;

  // Gestor menú
  $('#btnAddItem').onclick = addMenuItem;

  hydrateClientUI();
  renderCats(); renderMenu(); renderCart(); renderOrdersTable();
}
document.addEventListener('DOMContentLoaded', init);

// ===== Vistas por rol =====
function switchView(target){
  if(target==='workerView'){
    SESSION.role='worker'; SESSION.client=null; LS.set('session',SESSION);
    $('#view-cliente').style.display='none';
    $('#view-trabajador').style.display='block';
    $('#cartSection').style.display='none'; // ocultar carrito en trabajador
    $('#btnTabTrabajador').classList.add('active'); $('#btnTabCliente').classList.remove('active');
  }else{
    SESSION.role= SESSION.client ? 'client' : 'guest'; LS.set('session',SESSION);
    $('#view-cliente').style.display='block';
    $('#view-trabajador').style.display='none';
    $('#cartSection').style.display='block'; // visible para cliente/guest
    $('#btnTabCliente').classList.add('active'); $('#btnTabTrabajador').classList.remove('active');
  }
}
function hydrateClientUI(){
  // Estado de cuenta visible
  if(SESSION.client){
    $('#loggedBox').style.display='block';
    $('#authBox').style.display='none';
    $('#accName').textContent = SESSION.client.name;
    $('#accPhone').textContent = SESSION.client.phone;
    // Prellenar datos de checkout
    $('#cName').value = SESSION.client.name;
    $('#cPhone').value = SESSION.client.phone;
  }else{
    $('#loggedBox').style.display='none';
    $('#authBox').style.display='block';
  }
  switchView('clientView');
}

// ===== Cliente: login / register / logout =====
function clientLogin(){
  const phone = $('#clPhone').value.trim();
  const pass = $('#clPass').value.trim();
  const user = USERS.find(u=>u.phone===phone && u.pass===pass);
  if(!user){ $('#authMsg').textContent='Teléfono o contraseña inválidos'; return }
  SESSION = {role:'client', client:{name:user.name, phone:user.phone}}; LS.set('session',SESSION);
  $('#authMsg').textContent='Listo. Sesión iniciada.';
  hydrateClientUI();
}
function clientRegister(){
  const name=$('#rgName').value.trim(), phone=$('#rgPhone').value.trim(), pass=$('#rgPass').value.trim(), pass2=$('#rgPass2').value.trim();
  if(!name||!phone||!pass||!pass2){ $('#regMsg').textContent='Completa todos los campos'; return }
  if(pass!==pass2){ $('#regMsg').textContent='Las contraseñas no coinciden'; return }
  if(USERS.some(u=>u.phone===phone)){ $('#regMsg').textContent='Ese teléfono ya está registrado'; return }
  const user = {name, phone, pass, usedWelcome:false};
  USERS.push(user); LS.set('users', USERS);
  $('#regMsg').textContent='Cuenta creada. ¡Inicia sesión!';
  // opcional: iniciar sesión directo
  SESSION = {role:'client', client:{name, phone}}; LS.set('session',SESSION);
  hydrateClientUI();
}
function clientLogout(){ SESSION={role:'guest', client:null}; LS.set('session',SESSION); hydrateClientUI(); }

// ===== Categorías / Búsqueda =====
function catSet(){ return ['Todas', ...Array.from(new Set(MENU.map(i=>i.cat)))]; }
function renderCats(){
  const bar = $('#catBar'); bar.innerHTML='';
  catSet().forEach(c=>{
    const b = document.createElement('button');
    b.textContent=c; if(c===state.cat) b.classList.add('active');
    b.onclick=()=>{ state.cat=c; renderMenu(); };
    bar.appendChild(b);
  });
}
function renderMenu(){
  const grid = $('#grid'); grid.innerHTML='';
  const items = MENU
    .filter(i=> state.cat==='Todas' || i.cat===state.cat)
    .filter(i=> !state.q || (i.name.toLowerCase().includes(state.q) || (i.tags||[]).some(t=>t.toLowerCase().includes(state.q))));
  if(!items.length){ grid.innerHTML='<p class="muted">No hay productos para mostrar.</p>'; return; }
  items.forEach(p=>{
    const card = document.createElement('div'); card.className='product card';
    card.innerHTML = `
      <div class="img">${p.img?`<img src="${p.img}" alt="${p.name}" onerror="this.src='https://placehold.co/600x400?text=FastMex'">`:'<span class="muted">Sin imagen</span>'}</div>
      <div class="info">
        <div class="row-between">
          <h3>${p.name}</h3>
          <div class="price">${money(p.price)}</div>
        </div>
        <div class="muted" style="margin:.25rem 0 .5rem">${p.cat}</div>
        <div class="row-between">
          <div class="list-inline">${(p.tags||[]).map(t=>`<span class="chip">#${t}</span>`).join('')}</div>
          <button class="btn btn-primary" onclick='addToCart("${p.id}")'>Agregar 🛒</button>
        </div>
      </div>`;
    grid.appendChild(card);
  });
}

// ===== Carrito =====
function addToCart(id){ const r=state.cart.find(x=>x.id===id); if(r) r.qty++; else state.cart.push({id,qty:1}); renderCart(); }
function incQty(id){ const r=state.cart.find(x=>x.id===id); if(r){ r.qty++; renderCart(); } }
function decQty(id){ const r=state.cart.find(x=>x.id===id); if(r){ r.qty--; if(r.qty<=0) state.cart=state.cart.filter(x=>x.id!==id); renderCart(); } }
function removeFromCart(id){ state.cart=state.cart.filter(x=>x.id!==id); renderCart(); }
window.addToCart=addToCart; window.incQty=incQty; window.decQty=decQty; window.removeFromCart=removeFromCart;

function computeTotals(){
  let subtotal=0; state.cart.forEach(r=>{ const p=MENU.find(x=>x.id===r.id); if(p) subtotal+=p.price*r.qty; });
  const ship = subtotal>=30000?0:4000;
  const discount = state.coupon.amount || 0;
  const total = Math.max(0, subtotal + ship - discount);
  return {subtotal, ship, discount, total};
}
function renderCart(){
  const box = $('#cartList'); box.innerHTML='';
  if(!state.cart.length){ box.innerHTML='<p class="muted">Tu carrito está vacío.</p>'; }
  state.cart.forEach(row=>{
    const p = MENU.find(x=>x.id===row.id); if(!p) return;
    const li = document.createElement('div'); li.className='cart-item';
    li.innerHTML = `
      <img src="${p.img}" alt="${p.name}" onerror="this.src='https://placehold.co/100x100'"/>
      <div>
        <div class="row-between"><b>${p.name}</b> <span>${money(p.price)}</span></div>
        <div class="qty">
          <button onclick='decQty("${row.id}")'>–</button>
          <span>${row.qty}</span>
          <button onclick='incQty("${row.id}")'>+</button>
          <button class="btn btn-soft" style="margin-left:auto" onclick='removeFromCart("${row.id}")'>Quitar</button>
        </div>
      </div>
      <div><b>${money(p.price*row.qty)}</b></div>`;
    box.appendChild(li);
  });
  const t = computeTotals();
  $('#tSubtotal').textContent = money(t.subtotal);
  $('#tShip').textContent     = money(t.ship);
  $('#tDisc').textContent     = '-' + money(t.discount);
  $('#tTotal').textContent    = money(t.total);
}

// ===== Cupón =====
function applyCoupon(){
  const code = $('#inpCoupon').value.trim().toUpperCase();
  const t = computeTotals();
  let amount = 0;
  if(code==='BIENVENIDO10'){
    if(!SESSION.client){ alert('Regístrate o inicia sesión para usar este cupón.'); return; }
    const user = USERS.find(u=>u.phone===SESSION.client.phone);
    if(!user){ alert('Cuenta no encontrada.'); return;}
    if(user.usedWelcome){ alert('Este cupón ya fue usado en tu primera compra.'); return; }
    amount = Math.round(t.subtotal * 0.10);
  }else if(code==='TACOS2X1'){
    alert('Cupón 2x1 aplicado a tacos (demo visual, no combina con 10%).');
    amount = 0; // Demo: aquí podrías calcular según items tacos
  }else if(code){
    alert('Cupón inválido.');
    amount = 0;
  }
  state.coupon = {code, amount};
  renderCart();
}

// ===== Checkout / Pedido =====
function placeOrder(){
  if(!state.cart.length){ alert('Tu carrito está vacío'); return; }
  const name = $('#cName').value.trim();
  const phone = $('#cPhone').value.trim();
  const addr = $('#cAddr').value.trim();
  if(!name||!phone||!addr){ alert('Completa nombre, teléfono y dirección'); return; }

  // Construir items y totales
  const items = state.cart.map(r=>{const p=MENU.find(x=>x.id===r.id);return {id:p.id,name:p.name,price:p.price,qty:r.qty}});
  const totals = computeTotals();
  const id = uid();

  const order = {
    id, items, total: totals.total,
    customer:{name,phone,addr,pay:$('#cPay').value,note:$('#cNote').value},
    created: Date.now(),
    status: {text:'Recibido', cls:'prep'},
    coupon: state.coupon.code || null, discount: totals.discount
  };
  // === 💾 Paso 3: Guardar pedido en Firebase ===
  try {
    const ordersRef = ref(db, "orders");
    await push(ordersRef, order);
    console.log("✅ Pedido enviado a Firebase:", order);
  } catch (error) {
    console.error("❌ Error al guardar pedido:", error);
    alert("Error al conectar con el servidor, intenta nuevamente.");
    return;
  }

  // 🧹 Limpieza y confirmación
  alert("✅ Pedido enviado correctamente!");
  state.cart = [];
  renderCart();
}

  ORDERS.push(order); LS.set('orders', ORDERS);

  // Marcar cupón de bienvenida como usado si aplica
  if(SESSION.client && state.coupon.code==='BIENVENIDO10' && totals.discount>0){
    USERS = USERS.map(u=> u.phone===SESSION.client.phone ? {...u, usedWelcome:true} : u);
    LS.set('users', USERS);
  }

  state.cart=[]; state.coupon={code:null,amount:0}; $('#inpCoupon').value='';
  renderCart(); renderOrdersTable();
  $('#orderMsg').innerHTML = `✅ Pedido creado. Tu código es <b>${id}</b>.`;
  $('#trackId').value = id; $('#btnTabCliente').click();
}

// ===== Tracking (ya configurado arriba) =====

// ===== Trabajador: login/panel =====
function workerLogin() {
  const u = $('#user').value.trim(),
        p = $('#pass').value.trim();

  if (u === 'admin' && p === '1234') {
    SESSION = { role: 'worker', client: null };
    LS.set('session', SESSION);

    $('#loginBox').style.display = 'none';
    $('#dash').style.display = 'block';
    renderOrdersTable();
    renderMenuChips();
    switchView('workerView');

    // === 🔁 Escuchar pedidos en tiempo real (Paso 4) ===
    const ordersRef = ref(db, "orders");
    onValue(ordersRef, (snapshot) => {
      const data = snapshot.val() || {};
      const pedidos = Object.entries(data).map(([id, pedido]) => ({ id, ...pedido }));
      renderOrdersTable(pedidos);
      console.log("📦 Pedidos actualizados en tiempo real:", pedidos);
    });

  } else {
    $('#loginMsg').textContent = 'Credenciales incorrectas';
  }
}

// ===== Cerrar sesión =====
function workerLogout() {
  SESSION = { role: 'guest', client: null };
  LS.set('session', SESSION);
  $('#dash').style.display = 'none';
  $('#loginBox').style.display = 'block';
  switchView('clientView');
}



// ===== Tabla pedidos =====
function renderOrdersTable(){
  const tbody = $('#tblPedidos tbody'); if(!tbody) return;
  tbody.innerHTML='';
  ORDERS.forEach(o=>{
    const tr=document.createElement('tr');
    const itemsTxt = o.items.map(i=>`${i.name} x${i.qty}`).join(', ');
    tr.innerHTML = `
      <td>${o.id}</td>
      <td>${o.customer.name}</td>
      <td><div>${o.customer.phone}</div><div class="muted">${o.customer.addr}</div></td>
      <td>${itemsTxt}</td>
      <td>${money(o.total)}</td>
      <td><span class="chip">${o.status.text}</span></td>
      <td class="row" style="gap:6px">
        <button class="btn btn-soft" onclick='setStatus("${o.id}","Preparando")'>Preparar</button>
        <button class="btn btn-soft" onclick='setStatus("${o.id}","En camino")'>En camino</button>
        <button class="btn btn-warm" onclick='setStatus("${o.id}","Entregado")'>Entregar</button>
        <button class="btn btn-soft" onclick='setStatus("${o.id}","Cancelado")'>Cancelar</button>
        <button class="btn btn-primary" style="background:#b22222" onclick='deleteOrder("${o.id}")'>🗑️ Eliminar</button>
      </td>`;
    tbody.appendChild(tr);
  });
  $('#orderCount').textContent = `${ORDERS.length} pedidos activos`;
}

function setStatus(id, s){
  const o = ORDERS.find(x=>x.id===id); if(!o) return;
  const map = { 'Recibido':{text:'Recibido',cls:'prep'}, 'Preparando':{text:'Preparando',cls:'prep'}, 'En camino':{text:'En camino',cls:'road'}, 'Entregado':{text:'Entregado',cls:'done'}, 'Cancelado':{text:'Cancelado',cls:'danger'} };
  o.status = map[s] || {text:s,cls:'prep'}; LS.set('orders', ORDERS); renderOrdersTable();
}
// ===== Eliminar pedido desde Firebase =====
async function deleteOrder(id) {
  if (!confirm("¿Seguro que quieres eliminar este pedido? Esta acción no se puede deshacer.")) return;

  try {
    const orderRef = ref(db, "orders/" + id);
    await remove(orderRef);
    alert("🗑️ Pedido eliminado correctamente de Firebase.");
  } catch (error) {
    console.error("❌ Error al eliminar el pedido:", error);
    alert("Error al eliminar el pedido. Intenta nuevamente.");
  }
}

// Hacer disponible la función globalmente
window.deleteOrder = deleteOrder;


window.setStatus = setStatus;

// ===== Gestor de menú =====
function addMenuItem(){
  const name=$('#mName').value.trim(); const price=parseInt($('#mPrice').value||'0',10);
  const cat=$('#mCat').value; const img=$('#mImg').value.trim();
  if(!name||!price){ $('#addMsg').textContent='Nombre y precio son obligatorios'; return; }
  const id='i'+Math.random().toString(36).slice(2,6);
  MENU.push({id,name,price,cat,img}); LS.set('menuItems', MENU);
  $('#addMsg').textContent='Producto agregado'; renderCats(); renderMenu(); renderMenuChips();
  setTimeout(()=>$('#addMsg').textContent='',1500);
}
function deleteItem(id){ MENU = MENU.filter(p=>p.id!==id); LS.set('menuItems', MENU); renderCats(); renderMenu(); renderMenuChips(); }
window.deleteItem = deleteItem;
function renderMenuChips(){
  const box = $('#menuChips'); if(!box) return; box.innerHTML='';
  MENU.forEach(p=>{
    const div=document.createElement('div'); div.className='chip';
    div.innerHTML = `${p.name} · ${money(p.price)} <button class="btn btn-soft" style="margin-left:8px;padding:4px 8px" onclick='deleteItem("${p.id}")'>Eliminar</button>`;
    box.appendChild(div);
  });
}



