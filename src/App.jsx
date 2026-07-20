import { useState, useEffect, useCallback, useRef } from "react";
import { Search, ShoppingBag, Plus, Minus, X, ChevronRight, Loader2 } from "lucide-react";

// ── Conexión a Supabase (API REST, sin SDK) ──────────────────────────────
const SUPABASE_URL = "https://xwebdykftnvgryznjrtr.supabase.co";
const SUPABASE_KEY = "sb_publishable_vtM47zgia7CAJ_QHoybUhw_bT9ZJsk_";
const TABLE = "productosf";
const PAGE_SIZE = 20;

const sbHeaders = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
};

async function fetchProductos({ categoria, query, offset, limit }) {
  let url = `${SUPABASE_URL}/rest/v1/${TABLE}?select=*`;
  if (categoria && categoria !== "Todo") {
    url += `&categoria=eq.${encodeURIComponent(categoria)}`;
  }
  if (query && query.trim() !== "") {
    url += `&nombre=ilike.*${encodeURIComponent(query.trim())}*`;
  }
  url += `&order=nombre.asc&limit=${limit}&offset=${offset}`;
  const res = await fetch(url, { headers: sbHeaders });
  if (!res.ok) throw new Error("No se pudo cargar el catálogo");
  return res.json();
}

async function fetchCategorias() {
  const url = `${SUPABASE_URL}/rest/v1/${TABLE}?select=categoria`;
  const res = await fetch(url, { headers: sbHeaders });
  if (!res.ok) return [];
  const rows = await res.json();
  return Array.from(new Set(rows.map((r) => r.categoria))).sort();
}

// ── Estilo (idéntico al prototipo original) ──────────────────────────────
const INK = "#1D1128";
const PINK = "#FF5FA2";
const CREAM = "#FAF6F2";
const LAVENDER = "#F3ECF7";
const INK_MUTED = "#1D112899";
const INK_FAINT = "#1D112866";

const CATEGORY_COLORS = {
  cosmetico: { bg: "#FDE2ED", text: "#B3245C", dot: "#FF5FA2" },
  capilar: { bg: "#DFF3EC", text: "#1C7A5E", dot: "#2FBF8F" },
  uñas: { bg: "#EDE3FB", text: "#6B3FA0", dot: "#9C6ADE" },
  pestañas: { bg: "#FFF1D6", text: "#8A5A00", dot: "#E3A008" },
  juguetes: { bg: "#DCEBFD", text: "#1D5BA6", dot: "#3B82F6" },
};
const DEFAULT_COLOR = { bg: LAVENDER, text: INK, dot: INK };
const colorFor = (categoria) =>
  CATEGORY_COLORS[(categoria || "").toLowerCase()] || DEFAULT_COLOR;

const money = (n) =>
  new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(n || 0);

function Badge({ children }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
      style={{ backgroundColor: "#FFF1D6", color: "#8A5A00" }}
    >
      {children}
    </span>
  );
}

export default function Catalogo() {
  const [categoria, setCategoria] = useState("Todo");
  const [categorias, setCategorias] = useState([]);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  const [productos, setProductos] = useState([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [cart, setCart] = useState({});
  const [cartOpen, setCartOpen] = useState(false);
  const [entrega, setEntrega] = useState("domicilio");
  const [pago, setPago] = useState("efectivo");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");

  const debounceRef = useRef(null);

  // Categorías reales (una sola vez)
  useEffect(() => {
    fetchCategorias().then(setCategorias);
  }, []);

  // Carga inicial + recarga cuando cambia categoría o búsqueda (con debounce)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setOffset(0);
      setHasMore(true);
      setError(null);
      setLoading(true);
      fetchProductos({ categoria, query, offset: 0, limit: PAGE_SIZE })
        .then((rows) => {
          setProductos(rows);
          setHasMore(rows.length === PAGE_SIZE);
        })
        .catch(() => setError("No se pudo cargar el catálogo. Revisa tu conexión."))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoria, query]);

  const cargarMas = useCallback(() => {
    const nextOffset = offset + PAGE_SIZE;
    setLoading(true);
    fetchProductos({ categoria, query, offset: nextOffset, limit: PAGE_SIZE })
      .then((rows) => {
        setProductos((prev) => [...prev, ...rows]);
        setOffset(nextOffset);
        setHasMore(rows.length === PAGE_SIZE);
      })
      .catch(() => setError("No se pudo cargar más productos."))
      .finally(() => setLoading(false));
  }, [categoria, query, offset]);

  const setQty = (referencia, qty) => {
    setCart((prev) => {
      const next = { ...prev };
      if (qty <= 0) delete next[referencia];
      else next[referencia] = qty;
      return next;
    });
  };

  const cartItems = Object.entries(cart).map(([referencia, qty]) => {
    const p = productos.find((x) => String(x.referencia) === referencia);
    return p ? { ...p, qty } : null;
  }).filter(Boolean);

  const total = cartItems.reduce((sum, i) => sum + i.precio * i.qty, 0);
  const totalUnidades = cartItems.reduce((sum, i) => sum + i.qty, 0);

  const WHATSAPP_NUMBER = "573000000000"; // reemplazar por el número real del almacén

  const mensajeWhatsApp = () => {
    const lineas = cartItems
      .map((i) => `• ${i.qty} x ${i.nombre} — $${money(i.precio * i.qty)}`)
      .join("\n");
    const entregaTxt = entrega === "domicilio" ? "Domicilio" : "Recoger en tienda";
    const pagoTxt =
      pago === "efectivo" ? "Efectivo contraentrega" : pago === "transferencia" ? "Transferencia" : "Otro método";
    const datos =
      entrega === "domicilio"
        ? `Nombre: ${nombre}\nTeléfono: ${telefono}\nDirección: ${direccion}`
        : `Recoge: ${nombre}\nTeléfono: ${telefono}`;
    return `Hola, quiero hacer este pedido:\n\n${lineas}\n\nTotal: $${money(total)}\nEntrega: ${entregaTxt}\nPago: ${pagoTxt}\n\n${datos}`;
  };

  const linkWhatsApp = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(mensajeWhatsApp())}`;

  const datosCompletos =
    nombre.trim() !== "" && telefono.trim() !== "" && (entrega === "recoge" || direccion.trim() !== "");

  return (
    <div className="min-h-screen w-full overflow-x-hidden font-sans pb-28" style={{ backgroundColor: CREAM, color: INK }}>
      <header className="px-4 pb-4 pt-5" style={{ backgroundColor: INK, color: "#FFFFFF" }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: PINK }}>
              Pedido por mayor
            </p>
            <h1 className="text-2xl font-black leading-tight uppercase">D Container</h1>
          </div>
          <button
            onClick={() => setCartOpen(true)}
            style={{ backgroundColor: PINK, color: "#FFFFFF" }}
            className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-2 text-xs font-bold uppercase tracking-wide active:scale-95 transition"
            aria-label="Ver pedido"
          >
            <ShoppingBag size={14} />
            Pedido
            {totalUnidades > 0 && (
              <span
                className="flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold"
                style={{ backgroundColor: INK, color: "#FFFFFF" }}
              >
                {totalUnidades}
              </span>
            )}
          </button>
        </div>
      </header>

      <div className="sticky top-0 z-20 border-b" style={{ backgroundColor: CREAM, borderColor: "#00000010" }}>
        <div className="flex items-center gap-2 px-4 py-3">
          <button
            onClick={() => setSearchOpen((v) => !v)}
            aria-label="Buscar"
            style={
              searchOpen
                ? { backgroundColor: INK, color: "#FFFFFF" }
                : { backgroundColor: "#FFFFFF", color: INK_FAINT, border: "1px solid #00000018" }
            }
            className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition"
          >
            <Search size={14} />
            Buscar
          </button>
          <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto">
            {["Todo", ...categorias].map((c) => {
              const color = colorFor(c);
              const active = categoria === c;
              return (
                <button
                  key={c}
                  onClick={() => setCategoria(c)}
                  style={
                    active
                      ? { backgroundColor: INK, color: "#FFFFFF" }
                      : { backgroundColor: "#FFFFFF", color: INK_FAINT, border: "1px solid #00000018" }
                  }
                  className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wide transition capitalize"
                >
                  {c !== "Todo" && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color.dot }} />}
                  {c}
                </button>
              );
            })}
          </div>
        </div>

        {searchOpen && (
          <div className="flex items-center gap-2 px-4 py-2.5" style={{ backgroundColor: INK }}>
            <Search size={18} style={{ color: "#FFFFFF99" }} className="shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar producto..."
              className="w-full bg-transparent text-sm outline-none"
              style={{ color: "#FFFFFF" }}
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                aria-label="Borrar búsqueda"
                className="shrink-0 rounded-full p-1"
                style={{ backgroundColor: "#FFFFFF1A" }}
              >
                <X size={14} style={{ color: "#FFFFFFB3" }} />
              </button>
            )}
          </div>
        )}
      </div>

      <main className="px-4 py-4">
        {error && (
          <div className="mb-3 rounded-xl p-3 text-xs font-bold" style={{ backgroundColor: "#FDE2ED", color: "#B3245C" }}>
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {productos.map((p) => {
            const qty = cart[p.referencia] || 0;
            const color = colorFor(p.categoria);
            const min = p.unidades || 1;
            return (
              <div
                key={p.referencia}
                className="flex flex-col rounded-2xl p-3 shadow-[0_1px_3px_rgba(29,17,40,0.08)]"
                style={{ backgroundColor: "#FFFFFF" }}
              >
                <div
                  className="mb-2 flex h-20 items-center justify-center rounded-xl text-[10px] font-bold uppercase tracking-wide capitalize"
                  style={{ backgroundColor: color.bg, color: color.text }}
                >
                  {p.categoria}
                </div>
                <p className="text-sm font-bold leading-snug">{p.nombre}</p>
                <div className="mt-1 flex items-center gap-1.5">
                  <Badge>Mín. mayor {min}</Badge>
                </div>
                <div className="mt-2 flex items-end justify-between">
                  <p className="text-lg font-black" style={{ color: INK }}>${money(p.precio)}</p>
                  <p className="text-[10px]" style={{ color: INK_MUTED }}>Stock {p.existencias}</p>
                </div>

                {qty === 0 ? (
                  <button
                    onClick={() => setQty(p.referencia, min)}
                    style={{ backgroundColor: INK, color: "#FFFFFF" }}
                    className="mt-3 rounded-xl py-2 text-xs font-bold uppercase tracking-wide active:scale-95 transition"
                  >
                    Agregar
                  </button>
                ) : (
                  <div className="mt-3 flex items-center justify-between rounded-xl px-2 py-1.5" style={{ backgroundColor: LAVENDER }}>
                    <button
                      onClick={() => setQty(p.referencia, qty - 1)}
                      style={{ backgroundColor: "#FFFFFF", color: INK }}
                      className="rounded-lg p-1.5 active:scale-90 transition"
                      aria-label="Restar"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="text-sm font-bold" style={{ color: INK }}>{qty}</span>
                    <button
                      onClick={() => setQty(p.referencia, qty + 1)}
                      style={{ backgroundColor: "#FFFFFF", color: INK }}
                      className="rounded-lg p-1.5 active:scale-90 transition"
                      aria-label="Sumar"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {!loading && productos.length === 0 && !error && (
          <div className="py-16 text-center">
            <p className="text-sm font-bold" style={{ color: INK_MUTED }}>
              {query ? `No hay productos que coincidan con "${query}"` : "No hay productos en esta categoría"}
            </p>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-6">
            <Loader2 size={20} className="animate-spin" style={{ color: INK_MUTED }} />
          </div>
        )}

        {!loading && hasMore && productos.length > 0 && (
          <button
            onClick={cargarMas}
            style={{ backgroundColor: LAVENDER, color: INK }}
            className="mt-2 w-full rounded-xl py-3 text-xs font-bold uppercase tracking-wide active:scale-[0.98] transition"
          >
            Cargar más productos
          </button>
        )}
      </main>

      {totalUnidades > 0 && !cartOpen && (
        <button
          onClick={() => setCartOpen(true)}
          style={{ backgroundColor: PINK, color: "#FFFFFF" }}
          className="fixed bottom-4 left-4 right-4 z-20 flex items-center justify-between rounded-2xl px-5 py-4 shadow-lg active:scale-[0.98] transition"
        >
          <span className="text-sm font-bold">{totalUnidades} unidades · ${money(total)}</span>
          <span className="flex items-center gap-1 text-sm font-bold">Ver pedido <ChevronRight size={16} /></span>
        </button>
      )}

      {cartOpen && (
        <div className="fixed inset-0 z-30 flex items-end" style={{ backgroundColor: "#00000066" }}>
          <div className="w-full rounded-t-3xl p-5 max-h-[80vh] overflow-y-auto" style={{ backgroundColor: "#FFFFFF" }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black" style={{ color: INK }}>Tu pedido</h2>
              <button onClick={() => setCartOpen(false)} style={{ backgroundColor: LAVENDER }} className="rounded-full p-2" aria-label="Cerrar">
                <X size={18} style={{ color: INK }} />
              </button>
            </div>

            {cartItems.length === 0 ? (
              <p className="py-8 text-center text-sm" style={{ color: INK_MUTED }}>Aún no has agregado productos</p>
            ) : (
              <div className="space-y-3">
                {cartItems.map((item) => (
                  <div key={item.referencia} className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold" style={{ color: INK }}>{item.nombre}</p>
                      <p className="text-xs" style={{ color: INK_MUTED }}>{item.qty} × ${money(item.precio)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold" style={{ color: INK }}>${money(item.qty * item.precio)}</p>
                      <button
                        onClick={() => setQty(item.referencia, 0)}
                        aria-label={`Quitar ${item.nombre}`}
                        style={{ backgroundColor: LAVENDER, color: INK }}
                        className="shrink-0 rounded-full p-1.5 active:scale-90 transition"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}

                <div className="mt-4 flex items-center justify-between border-t pt-4" style={{ borderColor: "#00000018" }}>
                  <p className="text-sm font-bold uppercase tracking-wide" style={{ color: INK_FAINT }}>Total</p>
                  <p className="text-xl font-black" style={{ color: INK }}>${money(total)}</p>
                </div>

                <div className="mt-4">
                  <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: INK_FAINT }}>Forma de entrega</p>
                  <div className="flex gap-2">
                    {[{ id: "domicilio", label: "Domicilio" }, { id: "recoge", label: "Recoger en tienda" }].map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setEntrega(opt.id)}
                        style={entrega === opt.id ? { backgroundColor: INK, color: "#FFFFFF" } : { backgroundColor: LAVENDER, color: INK }}
                        className="flex-1 rounded-xl py-2.5 text-xs font-bold uppercase tracking-wide transition"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: INK_FAINT }}>Forma de pago</p>
                  <div className="flex gap-2">
                    {[{ id: "efectivo", label: "Efectivo" }, { id: "transferencia", label: "Transferencia" }, { id: "otro", label: "Otro" }].map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setPago(opt.id)}
                        style={pago === opt.id ? { backgroundColor: INK, color: "#FFFFFF" } : { backgroundColor: LAVENDER, color: INK }}
                        className="flex-1 rounded-xl py-2.5 text-xs font-bold uppercase tracking-wide transition"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: INK_FAINT }}>
                    {entrega === "domicilio" ? "Datos de despacho" : "Datos de quien recoge"}
                  </p>
                  <div className="space-y-2">
                    <input
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      placeholder={entrega === "domicilio" ? "Nombre de quien recibe" : "Nombre de quien recoge"}
                      className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                      style={{ backgroundColor: LAVENDER, color: INK }}
                    />
                    <input
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      inputMode="tel"
                      placeholder="Teléfono"
                      className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                      style={{ backgroundColor: LAVENDER, color: INK }}
                    />
                    {entrega === "domicilio" && (
                      <input
                        value={direccion}
                        onChange={(e) => setDireccion(e.target.value)}
                        placeholder="Dirección de despacho"
                        className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                        style={{ backgroundColor: LAVENDER, color: INK }}
                      />
                    )}
                  </div>
                </div>

                {datosCompletos ? (
                  <a
                    href={linkWhatsApp}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ backgroundColor: INK, color: "#FFFFFF" }}
                    className="mt-4 flex w-full items-center justify-center rounded-xl py-3.5 text-sm font-bold uppercase tracking-wide active:scale-[0.98] transition"
                  >
                    Confirmar por WhatsApp
                  </a>
                ) : (
                  <div className="mt-4 w-full rounded-xl py-3.5 text-center text-sm font-bold uppercase tracking-wide" style={{ backgroundColor: LAVENDER, color: INK_FAINT }}>
                    Completa tus datos
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
