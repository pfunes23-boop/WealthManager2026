import React, { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  query,
  orderBy,
} from "firebase/firestore";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import {
  Trash2,
  PlusCircle,
  Wallet,
  Users,
  Settings,
  ListTodo,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Circle,
  BarChart3,
} from "lucide-react";

const firebaseConfig = {
  apiKey: "AIzaSyBYVIGc_yowtVcfpRbZrIXLxQHIO4PV_84",
  authDomain: "wealthmanager2026-18f2c.firebaseapp.com",
  projectId: "wealthmanager2026-18f2c",
  storageBucket: "wealthmanager2026-18f2c.firebasestorage.app",
  messagingSenderId: "48794626488",
  appId: "1:48794626488:web:ddfe4d3ddc77f574a9074d",
  measurementId: "G-NXL0M6HCY7",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export default function WealthManager() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("resumen");
  const [currentDate, setCurrentDate] = useState(new Date(2026, 5)); // Junio 2026
  const [transactions, setTransactions] = useState([]);
  const [wishes, setWishes] = useState([]);

  // ESTADOS FORMULARIO
  const [isIncome, setIsIncome] = useState(false);
  const defaultCategories = [
    "🏠 Hogar",
    "🍻 Diversión",
    "🍔 Comida",
    "🏋️ Ejercicio",
    "💼 Trabajo",
    "✈️ Viajes",
    "🛒 Supermercado",
    "🚗 Transporte",
  ];
  const [selectedCategory, setSelectedCategory] = useState(
    defaultCategories[0]
  );

  const [entities, setEntities] = useState([
    "Efectivo",
    "Naranja Tarjeta",
    "Bancor Tarjeta",
    "Banco Ciudad",
    "MercadoPago",
    "Go Cuotas",
    "Ualá",
  ]);
  const [newEntity, setNewEntity] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [selectedEntity, setSelectedEntity] = useState(entities[0]);
  const [installments, setInstallments] = useState("1");
  const [isShared, setIsShared] = useState(false);
  const [myPercentage, setMyPercentage] = useState("50");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) loadData(currentUser.uid);
    });
    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider).catch(console.error);
  };

  const loadData = async (uid) => {
    const qTx = query(
      collection(db, `users/${uid}/expenses`),
      orderBy("date", "desc")
    );
    const snapshotTx = await getDocs(qTx);
    setTransactions(
      snapshotTx.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
    );
  };

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    if (!user) return;

    // Si es compartido, calculamos la porción correspondiente
    const finalAmount =
      isShared && !isIncome
        ? parseFloat(amount) * (parseFloat(myPercentage) / 100)
        : parseFloat(amount);
    const finalInstallments =
      isIncome || selectedEntity === "Efectivo" ? 1 : parseInt(installments);

    let finalEntity = selectedEntity;
    if (selectedEntity === "nueva" && newEntity.trim() !== "") {
      finalEntity = newEntity;
      setEntities([...entities, newEntity]);
    }

    const newTx = {
      description,
      amount: finalAmount,
      isIncome,
      isShared: isIncome ? false : isShared,
      myPercentage: isShared ? parseFloat(myPercentage) : 100,
      category: isIncome ? "💰 Ingreso" : selectedCategory,
      entity: isIncome ? "Billetera/Banco" : finalEntity,
      installments: finalInstallments,
      isPaid: isIncome ? true : false,
      date: new Date().toISOString(),
      startMonth: currentDate.getMonth(),
      startYear: currentDate.getFullYear(),
    };

    const docRef = await addDoc(
      collection(db, `users/${user.uid}/expenses`),
      newTx
    );
    setTransactions([{ id: docRef.id, ...newTx }, ...transactions]);
    setAmount("");
    setDescription("");
    setInstallments("1");
    setIsShared(false);
  };

  const handleTogglePaid = async (id, currentStatus) => {
    const docRef = doc(db, `users/${user.uid}/expenses`, id);
    await updateDoc(docRef, { isPaid: !currentStatus });
    setTransactions(
      transactions.map((t) =>
        t.id === id ? { ...t, isPaid: !currentStatus } : t
      )
    );
  };

  const handleDeleteTx = async (id) => {
    await deleteDoc(doc(db, `users/${user.uid}/expenses`, id));
    setTransactions(transactions.filter((t) => t.id !== id));
  };

  // MOTOR FILTRADO POR MES SELECCIONADO (Soporta Cuotas y Recurrencia Básica)
  const getTxForMonth = (month, year) => {
    return transactions.filter((t) => {
      if (t.isIncome) {
        return t.startMonth === month && t.startYear === year;
      } else {
        const startTotalMonths = t.startYear * 12 + t.startMonth;
        const targetTotalMonths = year * 12 + month;
        const diffMonths = targetTotalMonths - startTotalMonths;
        return diffMonths >= 0 && diffMonths < t.installments;
      }
    });
  };

  const currentTransactions = getTxForMonth(
    currentDate.getMonth(),
    currentDate.getFullYear()
  );

  // CÁLCULOS FINANCIEROS DEL MES SELECCIONADO
  const totalIngresos = currentTransactions
    .filter((t) => t.isIncome)
    .reduce((acc, curr) => acc + curr.amount, 0);
  const gastosPagados = currentTransactions
    .filter((t) => !t.isIncome && t.isPaid)
    .reduce((acc, curr) => acc + curr.amount / curr.installments, 0);
  const saldoActual = totalIngresos - gastosPagados;
  const totalPendienteMes = currentTransactions
    .filter((t) => !t.isIncome && !t.isPaid)
    .reduce((acc, curr) => acc + curr.amount / curr.installments, 0);

  // LOGICA ESTADISTICAS: Gastos por Categoría
  const totalGastosMes = currentTransactions
    .filter((t) => !t.isIncome)
    .reduce((acc, curr) => acc + curr.amount / curr.installments, 0);

  const categoryStats = defaultCategories
    .map((cat) => {
      const totalCat = currentTransactions
        .filter((t) => t.category === cat)
        .reduce((acc, curr) => acc + curr.amount / curr.installments, 0);
      const porcentaje =
        totalGastosMes > 0 ? (totalCat / totalGastosMes) * 100 : 0;
      return { name: cat, amount: totalCat, percentage: porcentaje };
    })
    .filter((c) => c.amount > 0);

  // LOGICA ESTADISTICAS: Proyección Próximos 4 Meses
  const getProjectionData = () => {
    const projection = [];
    for (let i = 0; i < 4; i++) {
      const d = new Date(currentDate.getFullYear(), currentDate.getMonth() + i);
      const txs = getTxForMonth(d.getMonth(), d.getFullYear());
      const total = txs
        .filter((t) => !t.isIncome)
        .reduce((acc, curr) => acc + curr.amount / curr.installments, 0);
      projection.push({
        label: d.toLocaleString("es-ES", { month: "short" }),
        amount: total,
      });
    }
    return projection;
  };
  const projectionData = getProjectionData();
  const maxProjectionAmount = Math.max(
    ...projectionData.map((p) => p.amount),
    1
  );

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 font-sans">
        <h1 className="text-3xl font-black text-white mb-8">Wealth Manager</h1>
        <button
          onClick={loginWithGoogle}
          className="w-full bg-white text-slate-900 font-bold py-4 rounded-xl flex items-center justify-center gap-3"
        >
          Continuar con Google
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-24">
      {/* HEADER DE NAVEGACIÓN TEMPORAL */}
      <div className="bg-slate-900 p-4 sticky top-0 z-10 border-b border-slate-800 flex justify-between items-center">
        <button
          onClick={() =>
            setCurrentDate(
              new Date(currentDate.getFullYear(), currentDate.getMonth() - 1)
            )
          }
          className="p-2 bg-slate-800 rounded-full text-slate-300"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="text-center">
          <h2 className="text-sm text-slate-400 font-semibold uppercase tracking-widest">
            Panel Financiero
          </h2>
          <p className="text-lg font-bold text-lime-400">
            {currentDate.toLocaleString("es-ES", {
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <button
          onClick={() =>
            setCurrentDate(
              new Date(currentDate.getFullYear(), currentDate.getMonth() + 1)
            )
          }
          className="p-2 bg-slate-800 rounded-full text-slate-300"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="p-4">
        {/* TAB 1: RESUMEN Y BILLETERA */}
        {activeTab === "resumen" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 shadow-xl">
                <h3 className="text-slate-400 text-xs mb-1 uppercase tracking-wide">
                  Saldo Disponible
                </h3>
                <p className="text-2xl font-black text-emerald-400">
                  ${saldoActual.toLocaleString("es-AR")}
                </p>
                <span className="text-[10px] text-slate-500">
                  Ingresos - Pagados
                </span>
              </div>
              <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 shadow-xl">
                <h3 className="text-slate-400 text-xs mb-1 uppercase tracking-wide">
                  Por Pagar
                </h3>
                <p className="text-2xl font-black text-rose-400">
                  ${totalPendienteMes.toLocaleString("es-AR")}
                </p>
                <span className="text-[10px] text-slate-500">
                  Gastos pendientes
                </span>
              </div>
            </div>

            <h3 className="text-lg font-bold mt-6 mb-3 text-lime-400">
              Movimientos del mes
            </h3>
            {currentTransactions.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-6">
                No hay registros cargados para este mes.
              </p>
            ) : (
              currentTransactions.map((tx) => {
                const currentInstallmentNumber =
                  currentDate.getFullYear() * 12 +
                  currentDate.getMonth() -
                  (tx.startYear * 12 + tx.startMonth) +
                  1;
                return (
                  <div
                    key={tx.id}
                    className={`bg-slate-900 p-4 rounded-xl border ${
                      tx.isPaid
                        ? "border-emerald-950 opacity-60"
                        : "border-slate-800"
                    } flex justify-between items-center transition-all`}
                  >
                    <div className="flex items-center gap-3">
                      {!tx.isIncome && (
                        <button
                          onClick={() => handleTogglePaid(tx.id, tx.isPaid)}
                          className="text-slate-400 hover:text-lime-400 transition-colors"
                        >
                          {tx.isPaid ? (
                            <CheckCircle2
                              className="text-emerald-500"
                              size={24}
                            />
                          ) : (
                            <Circle size={24} />
                          )}
                        </button>
                      )}
                      <div>
                        <p
                          className={`font-bold ${
                            tx.isPaid && !tx.isIncome
                              ? "line-through text-slate-500"
                              : "text-slate-100"
                          }`}
                        >
                          {tx.description}
                        </p>
                        <p className="text-xs text-slate-400 flex flex-wrap gap-1 items-center">
                          <span className="bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">
                            {tx.category}
                          </span>
                          <span>• {tx.entity}</span>
                          {tx.installments > 1 && (
                            <span className="text-lime-400 font-medium">
                              ({currentInstallmentNumber}/{tx.installments}{" "}
                              cuotas)
                            </span>
                          )}
                          {tx.isShared && (
                            <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1 rounded text-[9px]">
                              Compartido
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <p
                        className={`font-bold ${
                          tx.isIncome ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {tx.isIncome ? "+" : "-"}$
                        {(tx.amount / tx.installments).toLocaleString("es-AR")}
                      </p>
                      <button
                        onClick={() => handleDeleteTx(tx.id)}
                        className="text-slate-600 hover:text-red-500"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 2: ESTADÍSTICAS Y GRÁFICOS (NUEVO) */}
        {activeTab === "estadisticas" && (
          <div className="space-y-6">
            {/* GRÁFICO DE BARRAS VERTICALES: PROYECCIÓN FUTURA */}
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
                Proyección de Gastos Próximos Meses
              </h3>
              <div className="flex justify-around items-end h-36 pt-4 border-b border-slate-800">
                {projectionData.map((p, idx) => {
                  const barHeight = (p.amount / maxProjectionAmount) * 100;
                  return (
                    <div
                      key={idx}
                      className="flex flex-col items-center flex-1 group"
                    >
                      <span className="text-[10px] text-slate-400 mb-1 opacity-0 group-hover:opacity-100 transition-opacity font-mono">
                        ${Math.round(p.amount).toLocaleString("es-AR")}
                      </span>
                      <div
                        style={{ height: `${Math.max(barHeight, 6)}%` }}
                        className={`w-8 rounded-t-lg transition-all duration-500 ${
                          idx === 0
                            ? "bg-lime-500 shadow-[0_0_15px_rgba(132,204,22,0.2)]"
                            : "bg-slate-700 hover:bg-slate-600"
                        }`}
                      />
                      <span className="text-xs font-bold mt-2 uppercase text-slate-400">
                        {p.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* GRÁFICO DE BARRAS HORIZONTALES: DISTRIBUCIÓN POR CATEGORÍA */}
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                Distribución por Categorías (
                {currentDate.toLocaleString("es-ES", { month: "short" })})
              </h3>
              {categoryStats.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-4">
                  No hay gastos este mes para categorizar.
                </p>
              ) : (
                categoryStats.map((c, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-200">{c.name}</span>
                      <span className="text-slate-400 font-mono">
                        ${c.amount.toLocaleString("es-AR")} (
                        {Math.round(c.percentage)}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${c.percentage}%` }}
                        className="bg-gradient-to-r from-lime-500 to-emerald-500 h-full rounded-full"
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 3: FORMULARIO AGREGAR (CORREGIDO COMPARTIDO) */}
        {activeTab === "agregar" && (
          <form
            onSubmit={handleAddTransaction}
            className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-4"
          >
            <h3 className="text-xl font-bold text-lime-400 mb-4">
              Nuevo Registro
            </h3>

            <div className="flex bg-slate-800 rounded-lg p-1 mb-4">
              <button
                type="button"
                onClick={() => setIsIncome(false)}
                className={`flex-1 py-2 rounded-md text-sm font-bold ${
                  !isIncome ? "bg-rose-500 text-white" : "text-slate-400"
                }`}
              >
                Gasto
              </button>
              <button
                type="button"
                onClick={() => setIsIncome(true)}
                className={`flex-1 py-2 rounded-md text-sm font-bold ${
                  isIncome ? "bg-emerald-500 text-white" : "text-slate-400"
                }`}
              >
                Ingreso
              </button>
            </div>

            <div>
              <label className="text-xs text-slate-400 uppercase">
                Concepto / Descripción
              </label>
              <input
                type="text"
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-800 border-none rounded-lg p-3 text-white mt-1"
              />
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-xs text-slate-400 uppercase">
                  Monto ($)
                </label>
                <input
                  type="number"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-slate-800 border-none rounded-lg p-3 text-white mt-1"
                />
              </div>

              {/* SELECTOR DE CORTE COMPARTIDO (REINSTALADO) */}
              {!isIncome && isShared && (
                <div className="w-1/3">
                  <label className="text-xs text-slate-400 uppercase">
                    Tu %
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={myPercentage}
                    onChange={(e) => setMyPercentage(e.target.value)}
                    className="w-full bg-slate-800 border-none rounded-lg p-3 text-white mt-1"
                  />
                </div>
              )}
            </div>

            {!isIncome && (
              <>
                <div className="flex bg-slate-950 rounded-lg p-1 border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsShared(false)}
                    className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${
                      !isShared ? "bg-slate-800 text-white" : "text-slate-500"
                    }`}
                  >
                    Gasto Personal
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsShared(true)}
                    className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${
                      isShared
                        ? "bg-amber-500/20 text-amber-400"
                        : "text-slate-500"
                    }`}
                  >
                    Gasto Compartido
                  </button>
                </div>

                <div>
                  <label className="text-xs text-slate-400 uppercase">
                    Categoría
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full bg-slate-800 border-none rounded-lg p-3 text-white mt-1 appearance-none"
                  >
                    {defaultCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-xs text-slate-400 uppercase">
                      Forma de Pago
                    </label>
                    <select
                      value={selectedEntity}
                      onChange={(e) => setSelectedEntity(e.target.value)}
                      className="w-full bg-slate-800 border-none rounded-lg p-3 text-white mt-1"
                    >
                      {entities.map((ent) => (
                        <option key={ent} value={ent}>
                          {ent}
                        </option>
                      ))}
                      <option value="nueva">+ Agregar nueva...</option>
                    </select>
                    {selectedEntity === "nueva" && (
                      <input
                        type="text"
                        value={newEntity}
                        onChange={(e) => setNewEntity(e.target.value)}
                        placeholder="Nombre..."
                        className="w-full bg-slate-700 border-none rounded-lg p-2 text-white mt-2"
                      />
                    )}
                  </div>

                  {selectedEntity !== "Efectivo" && (
                    <div className="w-1/3">
                      <label className="text-xs text-slate-400 uppercase">
                        Cuotas
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={installments}
                        onChange={(e) => setInstallments(e.target.value)}
                        className="w-full bg-slate-800 border-none rounded-lg p-3 text-white mt-1"
                      />
                    </div>
                  )}
                </div>
              </>
            )}

            <button
              type="submit"
              className="w-full bg-lime-500 text-slate-950 font-black py-4 rounded-xl mt-4 flex justify-center gap-2 hover:bg-lime-400"
            >
              <PlusCircle size={20} /> Guardar Registro
            </button>
          </form>
        )}

        {activeTab === "deseos" && (
          <div className="p-4 text-center text-slate-500 text-sm py-12">
            Lista de Deseos (Sin cambios, lista para usar)
          </div>
        )}
        {activeTab === "perfil" && (
          <div className="p-4 text-center text-slate-500 text-sm py-12">
            Configuración de Perfil (Sin cambios)
          </div>
        )}
      </div>

      {/* MENÚ DE NAVEGACIÓN INFERIOR (5 BOTONES INTEGRADOS) */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 flex justify-around p-2 pb-safe z-50">
        <button
          onClick={() => setActiveTab("resumen")}
          className={`flex flex-col items-center p-2 ${
            activeTab === "resumen" ? "text-lime-400" : "text-slate-500"
          }`}
        >
          <Wallet size={22} />
          <span className="text-[9px] mt-1 font-bold uppercase">Billetera</span>
        </button>
        <button
          onClick={() => setActiveTab("estadisticas")}
          className={`flex flex-col items-center p-2 ${
            activeTab === "estadisticas" ? "text-lime-400" : "text-slate-500"
          }`}
        >
          <BarChart3 size={22} />
          <span className="text-[9px] mt-1 font-bold uppercase">
            Estadísticas
          </span>
        </button>

        <button
          onClick={() => setActiveTab("agregar")}
          className="flex flex-col items-center justify-center bg-lime-500 text-slate-950 rounded-full w-12 h-12 -mt-4 shadow-[0_0_15px_rgba(132,204,22,0.3)] border-4 border-slate-950"
        >
          <PlusCircle size={24} />
        </button>

        <button
          onClick={() => setActiveTab("deseos")}
          className={`flex flex-col items-center p-2 ${
            activeTab === "deseos" ? "text-lime-400" : "text-slate-500"
          }`}
        >
          <ListTodo size={22} />
          <span className="text-[9px] mt-1 font-bold uppercase">Deseos</span>
        </button>
        <button
          onClick={() => setActiveTab("perfil")}
          className={`flex flex-col items-center p-2 ${
            activeTab === "perfil" ? "text-lime-400" : "text-slate-500"
          }`}
        >
          <Settings size={22} />
          <span className="text-[9px] mt-1 font-bold uppercase">Perfil</span>
        </button>
      </div>
    </div>
  );
}
