"use client";

import { useEffect, useState } from "react";

const CATEGORY_FILTERS = [
  ["Semua", "Semua"],
  ["📚 Buku", "Buku"],
  ["✏️ Alat Tulis", "Alat Tulis"],
  ["🍔 Makanan", "Makanan"],
  ["👕 Fashion", "Fashion"],
  ["💻 Elektronik", "Elektronik"],
];

const SELL_CATEGORIES = ["Buku", "Alat Tulis", "Makanan", "Fashion", "Elektronik"];

const rupiah = (n) => "Rp" + Number(n).toLocaleString("id-ID");

function scrollTo(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

function openWhatsApp(phone, message) {
  const number = String(phone).replace(/\D/g, "");
  if (!number) {
    alert("Nomor WhatsApp belum diisi.");
    return;
  }
  window.open("https://wa.me/" + number + "?text=" + encodeURIComponent(message), "_blank");
}

function PriceInput({ value, onCommit }) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  return (
    <input
      type="number"
      min="1"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
      onBlur={async () => {
        if (Number(draft) === Number(value)) {
          setDraft(String(value));
          return;
        }
        const saved = await onCommit(draft);
        if (!saved) setDraft(String(value));
      }}
    />
  );
}

export default function CampusMart() {
  const [products, setProducts] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [cart, setCart] = useState([]);
  const [ready, setReady] = useState(false);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("Semua");
  const [userName, setUserName] = useState("");
  const [profileMessage, setProfileMessage] = useState("");
  const [adminLogged, setAdminLogged] = useState(false);
  const [adminConfigured, setAdminConfigured] = useState(null);
  const [adminUser, setAdminUser] = useState("");
  const [adminPass, setAdminPass] = useState("");
  const [adminMessage, setAdminMessage] = useState("");
  const [setupUser, setSetupUser] = useState("");
  const [setupPass, setSetupPass] = useState("");
  const [setupPass2, setSetupPass2] = useState("");
  const [setupMessage, setSetupMessage] = useState("");
  const [sell, setSell] = useState({ name: "", price: "", category: "Buku", icon: "📦", phone: "" });

  useEffect(() => {
    try {
      const storedCart = JSON.parse(localStorage.getItem("cmCart") || "[]");
      if (Array.isArray(storedCart)) setCart(storedCart);
      setUserName(localStorage.getItem("cmUser") || "");
    } catch {
      // Data lokal rusak: mulai dari keranjang kosong.
    }
    setReady(true);

    let active = true;

    fetch("/api/products", { cache: "no-store" })
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (!active) return;
        if (!res.ok || !data) {
          setCatalogError(
            data?.error === "database_unavailable"
              ? "Database katalog belum tersambung. Produk belum bisa ditampilkan."
              : "Gagal memuat produk dari server."
          );
          return;
        }
        setProducts(Array.isArray(data.products) ? data.products : []);
        setCatalogError("");
      })
      .catch(() => {
        if (active) setCatalogError("Tidak dapat menghubungi server.");
      })
      .finally(() => {
        if (active) setCatalogLoading(false);
      });

    fetch("/api/admin/session", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data) return;
        setAdminLogged(Boolean(data.admin));
        setAdminConfigured(Boolean(data.configured));
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem("cmCart", JSON.stringify(cart));
  }, [cart, ready]);

  const visibleProducts = products.filter(
    (p) =>
      (activeCategory === "Semua" || p.category === activeCategory) &&
      String(p.name).toLowerCase().includes(search.toLowerCase())
  );
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const categories = new Set(products.map((p) => p.category)).size;
  const productValue = products.reduce((sum, p) => sum + Number(p.price || 0), 0);

  function addCart(id) {
    const product = products.find((p) => p.id === id);
    if (!product) return;
    const existing = cart.find((item) => item.id === id);
    setCart(
      existing
        ? cart.map((item) => (item.id === id ? { ...item, quantity: item.quantity + 1 } : item))
        : [...cart, { ...product, quantity: 1 }]
    );
    alert("Produk ditambahkan ke keranjang.");
  }

  function removeItem(id) {
    setCart(cart.filter((item) => item.id !== id));
  }

  function contact(id) {
    const product = products.find((p) => p.id === id);
    if (!product) return;
    openWhatsApp(
      product.phone,
      `Halo, saya tertarik dengan ${product.name} di CampusMart. Apakah masih tersedia?`
    );
  }

  function checkout() {
    if (!cart.length) {
      alert("Keranjang masih kosong.");
      return;
    }
    const groups = {};
    cart.forEach((item) => (groups[item.phone] ??= []).push(item));
    const phones = Object.keys(groups);
    const items = groups[phones[0]];
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const message =
      "Halo, saya ingin memesan:\n" +
      items.map((item) => `- ${item.name} (${item.quantity} x ${rupiah(item.price)})`).join("\n") +
      "\nTotal: " +
      rupiah(total);
    if (phones.length > 1) {
      alert("Keranjang berisi penjual berbeda. Pesanan WhatsApp akan dikirim ke penjual dari produk pertama.");
    }
    openWhatsApp(phones[0], message);
  }

  async function submitProduct(event) {
    event.preventDefault();
    if (!adminLogged) {
      alert("Hanya pembuat project yang dapat menambahkan produk.");
      return;
    }
    const name = sell.name.trim();
    const price = Number(sell.price);
    const phone = sell.phone.trim();
    if (!name || price <= 0 || !phone) {
      alert("Periksa kembali data produk.");
      return;
    }

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          price,
          category: sell.category,
          icon: sell.icon.trim() || "📦",
          phone,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        alert((data && data.message) || "Gagal menambahkan produk.");
        return;
      }
      if (Array.isArray(data?.products)) setProducts(data.products);
      setSell({ name: "", price: "", category: "Buku", icon: "📦", phone: "" });
      alert("Produk berhasil ditambahkan.");
      scrollTo("produk");
    } catch {
      alert("Tidak dapat menghubungi server. Coba lagi.");
    }
  }

  function saveProfile() {
    const name = userName.trim();
    if (!name) {
      alert("Masukkan nama terlebih dahulu.");
      return;
    }
    localStorage.setItem("cmUser", name);
    setUserName(name);
    setProfileMessage("Halo, " + name + "! Profil tersimpan di browser ini.");
  }

  async function doLogin(username, password) {
    setAdminMessage("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        if (data && data.configured === false) setAdminConfigured(false);
        setAdminMessage((data && data.message) || "Username atau password salah.");
        return false;
      }
      setAdminLogged(true);
      setAdminConfigured(true);
      setAdminUser("");
      setAdminPass("");
      requestAnimationFrame(() => scrollTo("dashboard"));
      return true;
    } catch {
      setAdminMessage("Tidak dapat menghubungi server. Coba lagi.");
      return false;
    }
  }

  async function loginAdmin(event) {
    event.preventDefault();
    await doLogin(adminUser.trim(), adminPass);
  }

  async function createOwnerAccount(event) {
    event.preventDefault();
    setSetupMessage("");

    const username = setupUser.trim();
    const password = setupPass;
    if (username.length < 3) {
      setSetupMessage("Username minimal 3 karakter.");
      return;
    }
    if (password.length < 8) {
      setSetupMessage("Password minimal 8 karakter.");
      return;
    }
    if (password !== setupPass2) {
      setSetupMessage("Konfirmasi password tidak sama.");
      return;
    }

    try {
      const res = await fetch("/api/admin/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setSetupMessage((data && data.message) || "Gagal membuat akun pembuat project.");
        return;
      }
    } catch {
      setSetupMessage("Tidak dapat menghubungi server. Coba lagi.");
      return;
    }

    setSetupUser("");
    setSetupPass("");
    setSetupPass2("");
    setSetupMessage("");
    setAdminConfigured(true);
    await doLogin(username, password);
  }

  async function logoutAdmin() {
    try {
      const res = await fetch("/api/admin/logout", { method: "POST" });
      if (!res.ok) throw new Error("logout failed");
    } catch {
      alert("Gagal keluar dari dashboard. Coba lagi.");
      return;
    }
    setAdminLogged(false);
    setAdminUser("");
    setAdminPass("");
    setAdminMessage("");
  }

  async function updatePrice(id, value) {
    const price = Number(value);
    if (!price || price <= 0) {
      alert("Harga harus lebih dari 0.");
      return false;
    }
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ price }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        alert((data && data.message) || "Gagal mengubah harga.");
        return false;
      }
      if (Array.isArray(data?.products)) setProducts(data.products);
      setCart(cart.map((item) => (item.id === id ? { ...item, price } : item)));
      return true;
    } catch {
      alert("Tidak dapat menghubungi server. Coba lagi.");
      return false;
    }
  }

  async function deleteProduct(id) {
    const product = products.find((p) => p.id === id);
    if (!product || !confirm(`Hapus produk "${product.name}" dari CampusMart?`)) return;
    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        alert((data && data.message) || "Gagal menghapus produk.");
        return;
      }
      if (Array.isArray(data?.products)) setProducts(data.products);
      setCart(cart.filter((item) => item.id !== id));
    } catch {
      alert("Tidak dapat menghubungi server. Coba lagi.");
    }
  }

  async function resetProducts() {
    if (!confirm("Kembalikan produk ke data awal? Produk yang kamu tambahkan akan dihapus.")) return;
    try {
      const res = await fetch("/api/products/reset", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        alert((data && data.message) || "Gagal mengatur ulang produk.");
        return;
      }
      if (Array.isArray(data?.products)) setProducts(data.products);
      setCart([]);
    } catch {
      alert("Tidak dapat menghubungi server. Coba lagi.");
    }
  }

  return (
    <>
      <header>
        <div className="logo">
          🛍 Campus<span>Mart</span>
        </div>
        <nav>
          <a href="#beranda">🏠 Beranda</a>
          <a href="#produk">📦 Produk</a>
          {adminLogged && <a href="#jual">➕ Jual</a>}
          <a href="#keranjang">
            🛒 Keranjang (<span id="cart-count">{cartCount}</span>)
          </a>
          <a href="#profil">👤 Profil</a>
          <a href="#dashboard">🔐 Admin</a>
        </nav>
      </header>

      <section className="hero" id="beranda">
        <div>
          <h1>
            Belanja Mudah,
            <br />
            Untuk Mahasiswa!
          </h1>
          <p>
            Temukan kebutuhan kuliah dan sehari-hari
            <br />
            dengan mudah melalui CampusMart.
          </p>
          <button onClick={() => scrollTo("produk")}>Mulai Belanja →</button>
        </div>
        <div className="hero-icon">🎓🛍️</div>
      </section>

      <section className="container" id="produk">
        <h2 className="section-title">✨ Temukan Produk</h2>
        <input
          className="search"
          placeholder="Cari buku, makanan, alat tulis..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="categories">
          {CATEGORY_FILTERS.map(([label, value]) => (
            <button
              key={value}
              className={"category" + (activeCategory === value ? " active" : "")}
              onClick={() => setActiveCategory(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="products" id="product-list">
          {catalogLoading ? (
            <p className="empty">Memuat produk…</p>
          ) : visibleProducts.length ? (
            visibleProducts.map((p) => (
              <article className="product" key={p.id}>
                <div className="product-image">{p.icon}</div>
                <div className="product-info">
                  <h3>{p.name}</h3>
                  <p className="muted">{p.category}</p>
                  <p className="price">{rupiah(p.price)}</p>
                  <button onClick={() => addCart(p.id)}>🛒 Tambah Keranjang</button>
                  <button className="secondary" onClick={() => contact(p.id)}>
                    💬 Hubungi Penjual
                  </button>
                </div>
              </article>
            ))
          ) : (
            <p className="empty">{catalogError || "Produk tidak ditemukan."}</p>
          )}
        </div>
      </section>

      <section className="container" id="jual">
        <h2 className="section-title">🏪 Jual Produk Kamu</h2>
        {!adminLogged ? (
          <div className="panel" id="sell-locked">
            <h3>Khusus Pembuat Project</h3>
            <p className="muted" style={{ marginTop: 6 }}>
              Hanya pembuat project yang dapat menambahkan produk baru ke CampusMart. Masuk lewat Dashboard
              Admin untuk membuka formulir ini.
            </p>
            <button className="primary" style={{ marginTop: 14 }} onClick={() => scrollTo("dashboard")}>
              🔐 Masuk sebagai Admin
            </button>
          </div>
        ) : (
          <div className="panel">
            <p>Tambahkan barang yang ingin kamu jual di CampusMart.</p>
            <form onSubmit={submitProduct}>
              <label>Nama Produk</label>
              <input
                className="form-control"
                required
                placeholder="Contoh: Buku Pemrograman"
                value={sell.name}
                onChange={(e) => setSell({ ...sell, name: e.target.value })}
              />
              <label>Harga (Rp)</label>
              <input
                className="form-control"
                type="number"
                min="1"
                required
                placeholder="Contoh: 50000"
                value={sell.price}
                onChange={(e) => setSell({ ...sell, price: e.target.value })}
              />
              <label>Kategori</label>
              <select
                className="form-control"
                value={sell.category}
                onChange={(e) => setSell({ ...sell, category: e.target.value })}
              >
                {SELL_CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <label>Ikon produk (emoji)</label>
              <input
                className="form-control"
                value={sell.icon}
                onChange={(e) => setSell({ ...sell, icon: e.target.value })}
              />
              <label>Nomor WhatsApp penjual (contoh 628123456789)</label>
              <input
                className="form-control"
                required
                placeholder="628xxxxxxxxxx"
                value={sell.phone}
                onChange={(e) => setSell({ ...sell, phone: e.target.value })}
              />
              <button className="primary" type="submit">
                ＋ Tambahkan Produk
              </button>
            </form>
          </div>
        )}
      </section>

      <section className="container" id="keranjang">
        <h2 className="section-title">🛒 Keranjang Belanja</h2>
        <div className="panel">
          <div id="cart-list">
            {cart.length ? (
              cart.map((item) => (
                <div className="cart-item" key={item.id}>
                  <div>
                    <b>
                      {item.icon} {item.name}
                    </b>
                    <p>
                      {item.quantity} × {rupiah(item.price)}
                    </p>
                  </div>
                  <button className="remove" onClick={() => removeItem(item.id)}>
                    Hapus
                  </button>
                </div>
              ))
            ) : (
              <p className="empty">Keranjang kamu masih kosong.</p>
            )}
          </div>
          <h3 id="total" style={{ margin: "16px 0" }}>
            Total: {rupiah(cartTotal)}
          </h3>
          <button className="primary" onClick={checkout}>
            Pesan melalui WhatsApp
          </button>
        </div>
      </section>

      <section className="container" id="profil">
        <h2 className="section-title">👤 Profil Pengguna</h2>
        <div className="panel">
          <label>Nama kamu</label>
          <input
            className="form-control"
            placeholder="Masukkan nama"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
          />
          <button className="primary" onClick={saveProfile}>
            Simpan Profil
          </button>
          <p id="profile-message" style={{ marginTop: 12 }}>
            {profileMessage}
          </p>
        </div>
      </section>

      <section className="container" id="dashboard">
        <h2 className="section-title">🔐 Dashboard Admin</h2>

        {adminConfigured === false && (
          <div className="panel" id="admin-setup">
            <h3>Buat Akun Pembuat Project</h3>
            <p className="muted" style={{ marginTop: 6 }}>
              Akun ini hanya bisa dibuat satu kali dan menjadi satu-satunya akun yang dapat menambah produk.
            </p>
            <form style={{ marginTop: 16, maxWidth: 420 }} onSubmit={createOwnerAccount}>
              <label>Username</label>
              <input
                className="form-control"
                autoComplete="username"
                placeholder="Username pembuat project"
                value={setupUser}
                onChange={(e) => setSetupUser(e.target.value)}
              />
              <label>Password (minimal 8 karakter)</label>
              <input
                className="form-control"
                type="password"
                autoComplete="new-password"
                placeholder="Password baru"
                value={setupPass}
                onChange={(e) => setSetupPass(e.target.value)}
              />
              <label>Ulangi password</label>
              <input
                className="form-control"
                type="password"
                autoComplete="new-password"
                placeholder="Ulangi password"
                value={setupPass2}
                onChange={(e) => setSetupPass2(e.target.value)}
              />
              <button className="primary" type="submit">
                Buat Akun Pembuat
              </button>
              <p id="admin-message">{setupMessage}</p>
            </form>
          </div>
        )}

        {adminConfigured === true && !adminLogged && (
          <div className="panel" id="admin-login">
            <h3>Masuk sebagai Admin</h3>
            <p className="muted" style={{ marginTop: 6 }}>
              Kelola produk CampusMart dari dashboard ini.
            </p>
            <form id="admin-form" style={{ marginTop: 16, maxWidth: 420 }} onSubmit={loginAdmin}>
              <label>Username</label>
              <input
                className="form-control"
                autoComplete="username"
                placeholder="Masukkan username"
                value={adminUser}
                onChange={(e) => setAdminUser(e.target.value)}
              />
              <label>Password</label>
              <input
                className="form-control"
                type="password"
                autoComplete="current-password"
                placeholder="Masukkan password"
                value={adminPass}
                onChange={(e) => setAdminPass(e.target.value)}
              />
              <button className="primary" type="submit">
                Masuk Dashboard
              </button>
              <p id="admin-message">{adminMessage}</p>
            </form>
          </div>
        )}

        {adminLogged && (
          <div id="admin-panel">
            <div className="stats" id="admin-stats">
              <div className="stat">
                <strong>{products.length}</strong>
                <span className="muted">Total Produk</span>
              </div>
              <div className="stat">
                <strong>{rupiah(productValue)}</strong>
                <span className="muted">Total Nilai</span>
              </div>
              <div className="stat">
                <strong>{categories}</strong>
                <span className="muted">Kategori</span>
              </div>
              <div className="stat">
                <strong>{cartCount}</strong>
                <span className="muted">Item di Keranjang</span>
              </div>
            </div>
            <div className="panel">
              <div className="dash-top">
                <h3>Daftar Produk</h3>
                <div>
                  <button className="danger" onClick={resetProducts}>
                    ↺ Reset Produk
                  </button>
                  <button className="out" onClick={logoutAdmin}>
                    Keluar
                  </button>
                </div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Produk</th>
                      <th>Kategori</th>
                      <th>Harga (Rp)</th>
                      <th>WhatsApp</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody id="admin-rows">
                    {products.length ? (
                      products.map((p) => (
                        <tr key={p.id}>
                          <td>
                            <b>
                              {p.icon} {p.name}
                            </b>
                            <br />
                            <span className="muted">ID {p.id}</span>
                          </td>
                          <td>
                            <span className="badge">{p.category}</span>
                          </td>
                          <td>
                            <PriceInput value={p.price} onCommit={(value) => updatePrice(p.id, value)} />
                          </td>
                          <td className="muted">{p.phone}</td>
                          <td>
                            <button className="danger" onClick={() => deleteProduct(p.id)}>
                              Hapus
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="empty">
                          Belum ada produk.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </section>

      <footer>
        <h2>🛍 CampusMart</h2>
        <p style={{ marginTop: 8 }}>Marketplace sederhana untuk kebutuhan mahasiswa.</p>
        <p style={{ marginTop: 10 }}>© 2026 CampusMart</p>
      </footer>
    </>
  );
}
