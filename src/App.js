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
  PlusCircle,
  Wallet,
  Settings,
  ListTodo,
  Users,
  CheckCircle2,
  Target,
  TrendingDown,
  Trash2,
  Zap,
  TrendingUp,
  LogOut,
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
  const [debts, setDebts] = useState([]);
  const [paymentAmounts, setPaymentAmounts] = useState({});

  // ESTADOS FORMULARIO
  const [debtName, setDebtName] = useState("");
  const categories = [
    "Tarjeta de Crédito",
    "Préstamo Personal",
    "Hogar",
    "Vehículo",
    "Viajes",
    "Diversión",
    "Otro",
  ];
  const [selectedCategory, setSelectedCategory] = useState(categories[0]);
  const [originalAmount, setOriginalAmount] = useState("");
  const [currentBalance, setCurrentBalance] = useState("");
  const [currency, setCurrency] = useState("ARS - Peso Argentino");
  const [apr, setApr] = useState("0.00");
  const [minPayment, setMinPayment] = useState("");
  const [durationMonths, setDurationMonths] = useState("1");
  const [dueDay, setDueDay] = useState("10");
  const [isShared, setIsShared] = useState(false);
  const [myPercentage, setMyPercentage] = useState("50");

  // ESTADOS ESTRATEGIA
  const [strategy, setStrategy] = useState("snowball"); // "snowball" o "avalanche"
  const [extraPayment, setExtraPayment] = useState("0");

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

  const handleSignOut = () => {
    signOut(auth).then(() => setUser(null));
  };

  const loadData = async (uid) => {
    const qTx = query(
      collection(db, `users/${uid}/debts`),
      orderBy("createdAt", "desc")
    );
    const snapshotTx = await getDocs(qTx);
    setDebts(snapshotTx.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
  };

  const handleAddDebt = async (e) => {
    e.preventDefault();
    if (!user) return;

    const myRatio = isShared ? parseFloat(myPercentage) / 100 : 1;
    const finalOriginal = parseFloat(originalAmount) * myRatio;
    const finalCurrent = currentBalance
      ? parseFloat(currentBalance) * myRatio
      : finalOriginal;
    const finalMin = parseFloat(minPayment) * myRatio;

    const newDebt = {
      name: debtName,
      category: selectedCategory,
      originalAmount: parseFloat(originalAmount),
      currentBalance: parseFloat(currentBalance || originalAmount),
      myResponsibilityAmount: finalCurrent,
      currency,
      apr: parseFloat(apr),
      minPayment: finalMin,
      durationMonths: parseInt(durationMonths),
      dueDay: parseInt(dueDay),
      isShared,
      myPercentage: isShared ? parseFloat(myPercentage) : 100,
      createdAt: new Date().toISOString(),
      status: "active",
    };

    const docRef = await addDoc(
      collection(db, `users/${user.uid}/debts`),
      newDebt
    );
    setDebts([{ id: docRef.id, ...newDebt }, ...debts]);

    setDebtName("");
    setOriginalAmount("");
    setCurrentBalance("");
    setMinPayment("");
    setApr("0.00");
    setActiveTab("seguimiento");
  };

  const handleDeleteDebt = async (id) => {
    if (window.confirm("¿Seguro que querés eliminar esta deuda?")) {
      await deleteDoc(doc(db, `users/${user.uid}/debts`, id));
      setDebts(debts.filter((d) => d.id !== id));
    }
  };

  const handleRegisterPayment = async (debt) => {
    const payAmount = parseFloat(paymentAmounts[debt.id]);
    if (!payAmount || payAmount <= 0) return;

    const myRatio = debt.isShared ? debt.myPercentage / 100 : 1;
    const totalPayAmount = payAmount / myRatio;

    const newMyResp = Math.max(0, debt.myResponsibilityAmount - payAmount);
    const newCurrentBalance = Math.max(0, debt.currentBalance - totalPayAmount);

    const docRef = doc(db, `users/${user.uid}/debts`, debt.id);
    await updateDoc(docRef, {
      currentBalance: newCurrentBalance,
      myResponsibilityAmount: newMyResp,
      status: newMyResp === 0 ? "paid" : "active",
    });

    setDebts(
      debts.map((d) =>
        d.id === debt.id
          ? {
              ...d,
              currentBalance: newCurrentBalance,
              myResponsibilityAmount: newMyResp,
              status: newMyResp === 0 ? "paid" : "active",
            }
          : d
      )
    );
    setPaymentAmounts({ ...paymentAmounts, [debt.id]: "" });
  };

  // --------------------------------------------------------
  // LÓGICA DE DATOS
  // --------------------------------------------------------
  const activeDebts = debts.filter((d) => d.status === "active");
  const totalOriginal = activeDebts.reduce(
    (acc, d) => acc + d.originalAmount * (d.myPercentage / 100),
    0
  );
  const totalActual = activeDebts.reduce(
    (acc, d) => acc + d.myResponsibilityAmount,
    0
  );
  const porcentajePagado =
    totalOriginal > 0
      ? ((totalOriginal - totalActual) / totalOriginal) * 100
      : 0;
  const totalMinimo = activeDebts.reduce((acc, d) => acc + d.minPayment, 0);

  const deudaMayorMonto =
    activeDebts.length > 0
      ? activeDebts.reduce((p, c) =>
          p.myResponsibilityAmount > c.myResponsibilityAmount ? p : c
        )
      : null;

  // ORDENAMIENTO DE ESTRATEGIAS
  const sortedDebts = [...activeDebts].sort((a, b) => {
    if (strategy === "snowball")
      return a.myResponsibilityAmount - b.myResponsibilityAmount;
    return b.apr - a.apr; // Avalanche (Mayor interés primero)
  });
  const targetDebt = sortedDebts.length > 0 ? sortedDebts[0] : null;

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center p-6 font-sans">
        <h1 className="text-3xl font-black text-cyan-400 mb-2">
          Wealth Manager
        </h1>
        <p className="text-gray-400 mb-8 text-sm text-center">
          Gestión inteligente de finanzas y deudas compartidas.
        </p>
        <button
          onClick={loginWithGoogle}
          className="w-full bg-white text-[#0F172A] font-bold py-4 rounded-xl flex items-center justify-center gap-3 hover:bg-gray-200 transition-colors"
        >
          Continuar con Google
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#111827] text-slate-100 font-sans pb-24">
      {/* HEADER */}
      <div className="bg-[#1F2937] p-5 sticky top-0 z-10 border-b border-gray-800 flex justify-between items-center shadow-md">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight capitalize">
            {activeTab === "agregar"
              ? "Añadir Deuda"
              : activeTab === "seguimiento"
              ? "Deudas"
              : activeTab === "estrategias"
              ? "Estrategia Activa"
              : activeTab === "resumen"
              ? "¡Hola!"
              : activeTab}
          </h2>
          {activeTab === "resumen" && (
            <p className="text-xs text-gray-400 mt-0.5">
              Su resumen financiero
            </p>
          )}
          {activeTab === "estrategias" && (
            <p className="text-xs text-gray-400 mt-0.5">Optimizá tus pagos</p>
          )}
        </div>
        <div className="w-10 h-10 bg-cyan-900 rounded-full flex items-center justify-center text-cyan-400 font-bold border border-cyan-700 shadow-[0_0_10px_rgba(6,182,212,0.2)]">
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt="perfil"
              className="w-full h-full rounded-full"
            />
          ) : (
            user.displayName?.charAt(0).toUpperCase()
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* ======================= RESUMEN ======================= */}
        {activeTab === "resumen" && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-[#1F2937] p-5 rounded-2xl border border-gray-800 shadow-lg relative overflow-hidden">
              <div className="absolute top-4 right-4 bg-cyan-500/20 text-cyan-400 text-[10px] font-bold px-2 py-1 rounded">
                PRO
              </div>
              <h3 className="text-lg font-bold text-white mb-4">
                Progreso de Deuda
              </h3>
              <div className="flex justify-between items-center">
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Deuda Total</p>
                    <p className="text-3xl font-black text-cyan-400">
                      $
                      {totalActual.toLocaleString("es-AR", {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">
                      Mínimo Mensual
                    </p>
                    <p className="text-sm font-bold text-white">
                      ${totalMinimo.toLocaleString("es-AR")}
                    </p>
                  </div>
                </div>
                <div className="relative w-32 h-32 flex-shrink-0">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="currentColor"
                      strokeWidth="12"
                      fill="transparent"
                      className="text-gray-700"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="currentColor"
                      strokeWidth="12"
                      fill="transparent"
                      strokeDasharray={2 * Math.PI * 56}
                      strokeDashoffset={
                        2 * Math.PI * 56 -
                        (porcentajePagado / 100) * (2 * Math.PI * 56)
                      }
                      className="text-cyan-500 transition-all duration-1000"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-black text-white">
                      {Math.round(porcentajePagado)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#1F2937] p-4 rounded-xl border border-gray-800 flex gap-4 items-start border-l-4 border-l-cyan-500">
              <div className="bg-cyan-500/20 p-2 rounded-full mt-1">
                <Target className="text-cyan-400" size={18} />
              </div>
              <div>
                <p className="text-sm font-bold text-white mb-1">
                  Concéntrese en{" "}
                  {deudaMayorMonto ? deudaMayorMonto.name : "Tus metas"}
                </p>
                <p className="text-xs text-gray-400">
                  {deudaMayorMonto
                    ? `Representa tu mayor carga con $${deudaMayorMonto.myResponsibilityAmount.toLocaleString(
                        "es-AR"
                      )}.`
                    : "Estás libre de deudas. ¡Ahorrá!"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ======================= ESTRATEGIAS ======================= */}
        {activeTab === "estrategias" && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider ml-1">
              Elegir Método
            </h3>

            <div
              onClick={() => setStrategy("avalanche")}
              className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                strategy === "avalanche"
                  ? "bg-cyan-900/30 border-cyan-500"
                  : "bg-[#1F2937] border-gray-800"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-white flex items-center gap-2">
                  <TrendingDown size={18} className="text-cyan-400" /> Avalancha
                  de Deuda
                </h4>
                {strategy === "avalanche" && (
                  <CheckCircle2 size={18} className="text-cyan-400" />
                )}
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Pague primero las deudas con las tasas de interés más altas
                (APR) para minimizar el total pagado a largo plazo.
              </p>
            </div>

            <div
              onClick={() => setStrategy("snowball")}
              className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                strategy === "snowball"
                  ? "bg-cyan-900/30 border-cyan-500"
                  : "bg-[#1F2937] border-gray-800"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-white flex items-center gap-2">
                  <TrendingUp size={18} className="text-cyan-400" /> Bola de
                  Nieve
                </h4>
                {strategy === "snowball" && (
                  <CheckCircle2 size={18} className="text-cyan-400" />
                )}
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Pague primero las deudas más pequeñas para generar impulso y
                mantenerse motivado con victorias rápidas.
              </p>
            </div>

            <div className="bg-[#1F2937] p-5 rounded-2xl border border-gray-800 shadow-lg mt-6">
              <h3 className="text-sm font-bold text-cyan-400 flex items-center gap-2 mb-4">
                <Zap size={18} /> Calculadora "Qué Pasaría Si"
              </h3>
              <p className="text-xs text-gray-400 mb-3">
                Pago mensual adicional (sobrante):
              </p>

              <div className="flex items-center gap-3 mb-6">
                <input
                  type="range"
                  min="0"
                  max="500000"
                  step="5000"
                  value={extraPayment}
                  onChange={(e) => setExtraPayment(e.target.value)}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
                <span className="bg-[#374151] px-3 py-2 rounded-lg font-mono text-cyan-400 font-bold border border-cyan-900 min-w-[90px] text-center">
                  ${parseInt(extraPayment).toLocaleString("es-AR")}
                </span>
              </div>

              {targetDebt ? (
                <div className="bg-[#111827] p-4 rounded-xl border border-gray-700">
                  <p className="text-xs text-gray-400 mb-2">
                    Tu objetivo prioritario actual es:
                  </p>
                  <p className="text-lg font-bold text-white">
                    {targetDebt.name}
                  </p>
                  <div className="flex justify-between mt-2 pt-2 border-t border-gray-800 text-xs">
                    <span className="text-gray-500">A pagar este mes:</span>
                    <span className="font-bold text-emerald-400">
                      $
                      {(
                        targetDebt.minPayment + parseInt(extraPayment)
                      ).toLocaleString("es-AR")}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-emerald-500 text-center">
                  ¡No tenés deudas para aplicar estrategias!
                </p>
              )}
            </div>
          </div>
        )}

        {/* ======================= DEUDAS (SEGUIMIENTO) ======================= */}
        {activeTab === "seguimiento" && (
          <div className="space-y-4 animate-fade-in">
            {debts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">
                  Aún no hay deudas registradas.
                </p>
                <button
                  onClick={() => setActiveTab("agregar")}
                  className="bg-cyan-500 text-slate-900 font-bold px-6 py-2 rounded-lg"
                >
                  Añadir tu primera deuda
                </button>
              </div>
            ) : (
              debts.map((debt) => (
                <div
                  key={debt.id}
                  className={`bg-[#1F2937] p-5 rounded-2xl border ${
                    debt.status === "paid"
                      ? "border-emerald-500/30 opacity-70"
                      : "border-gray-800"
                  } shadow-lg`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3
                        className={`text-lg font-bold ${
                          debt.status === "paid"
                            ? "text-emerald-500 line-through"
                            : "text-white"
                        }`}
                      >
                        {debt.name}
                      </h3>
                      <p className="text-xs text-gray-400 mt-1 flex items-center gap-2">
                        <span className="bg-[#374151] px-2 py-0.5 rounded text-[10px]">
                          {debt.category}
                        </span>
                        {debt.isShared && (
                          <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1 rounded text-[9px]">
                            Compartido ({debt.myPercentage}%)
                          </span>
                        )}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteDebt(debt.id)}
                      className="text-gray-600 hover:text-red-500"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  <div className="mb-4">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">
                      Saldo Actual
                    </p>
                    <p
                      className={`text-2xl font-black ${
                        debt.status === "paid"
                          ? "text-emerald-500"
                          : "text-cyan-400"
                      }`}
                    >
                      $
                      {debt.myResponsibilityAmount.toLocaleString("es-AR", {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                  {debt.status === "active" ? (
                    <div className="bg-[#111827] p-3 rounded-xl border border-gray-700 flex flex-col gap-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-400">Pago Mínimo:</span>
                        <span className="font-bold text-gray-200">
                          ${debt.minPayment.toLocaleString("es-AR")}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          placeholder="Monto..."
                          value={paymentAmounts[debt.id] || ""}
                          onChange={(e) =>
                            setPaymentAmounts({
                              ...paymentAmounts,
                              [debt.id]: e.target.value,
                            })
                          }
                          className="w-full bg-[#1F2937] border border-cyan-900 rounded-lg py-2 px-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        />
                        <button
                          onClick={() => handleRegisterPayment(debt)}
                          className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-4 py-2 rounded-lg text-xs shadow"
                        >
                          Pagar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 flex items-center justify-center gap-2 text-emerald-400 font-bold text-sm">
                      <CheckCircle2 size={18} /> ¡Deuda Saldada!
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* ======================= AGREGAR ======================= */}
        {activeTab === "agregar" && (
          <form onSubmit={handleAddDebt} className="space-y-5 animate-fade-in">
            {/* Componente idéntico a la fase anterior - Minimizado para el ejemplo */}
            <div className="bg-[#1F2937] p-5 rounded-2xl border border-gray-800 space-y-4">
              <label className="text-xs font-bold text-gray-400 block">
                Nombre de la Deuda *
              </label>
              <input
                type="text"
                required
                value={debtName}
                onChange={(e) => setDebtName(e.target.value)}
                className="w-full bg-[#374151] border border-gray-600 rounded-xl p-3 text-white"
              />
              <label className="text-xs font-bold text-gray-400 block mt-2">
                Frasco Compartido
              </label>
              <input
                type="checkbox"
                checked={isShared}
                onChange={() => setIsShared(!isShared)}
                className="mr-2"
              />{" "}
              <span className="text-sm text-gray-300">Dividir deuda</span>
              {isShared && (
                <input
                  type="number"
                  value={myPercentage}
                  onChange={(e) => setMyPercentage(e.target.value)}
                  placeholder="Tu porcentaje %"
                  className="w-full bg-[#374151] border border-gray-600 rounded-xl p-3 text-white mt-2"
                />
              )}
              <div className="grid grid-cols-2 gap-4 mt-2">
                <input
                  type="number"
                  required
                  placeholder="Total Original"
                  value={originalAmount}
                  onChange={(e) => setOriginalAmount(e.target.value)}
                  className="bg-[#374151] rounded-xl p-3 text-white w-full"
                />
                <input
                  type="number"
                  placeholder="Saldo Actual"
                  value={currentBalance}
                  onChange={(e) => setCurrentBalance(e.target.value)}
                  className="bg-[#374151] rounded-xl p-3 text-white w-full"
                />
                <input
                  type="number"
                  step="0.1"
                  placeholder="Interés %"
                  value={apr}
                  onChange={(e) => setApr(e.target.value)}
                  className="bg-[#374151] rounded-xl p-3 text-white w-full"
                />
                <input
                  type="number"
                  required
                  placeholder="Pago Mínimo"
                  value={minPayment}
                  onChange={(e) => setMinPayment(e.target.value)}
                  className="bg-[#374151] rounded-xl p-3 text-white w-full"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-cyan-500 text-slate-950 font-black py-4 rounded-xl mt-4"
              >
                Guardar Deuda
              </button>
            </div>
          </form>
        )}

        {/* ======================= AJUSTES ======================= */}
        {activeTab === "ajustes" && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-[#1F2937] p-5 rounded-2xl border border-gray-800 shadow-lg flex items-center gap-4">
              <img
                src={user.photoURL || "https://via.placeholder.com/150"}
                alt="Avatar"
                className="w-16 h-16 rounded-full border-2 border-cyan-500"
              />
              <div>
                <h3 className="font-bold text-white text-lg">
                  {user.displayName}
                </h3>
                <p className="text-xs text-gray-400">{user.email}</p>
                <p className="text-[10px] text-cyan-500 mt-1 uppercase font-bold">
                  Miembro PRO
                </p>
              </div>
            </div>

            <div className="bg-[#1F2937] rounded-2xl border border-gray-800 shadow-lg overflow-hidden">
              <div className="p-4 border-b border-gray-700/50 flex justify-between items-center hover:bg-[#374151] cursor-pointer">
                <span className="text-sm font-medium text-gray-300">
                  Cambiar Idioma
                </span>
                <span className="text-xs text-gray-500">Español {">"}</span>
              </div>
              <div className="p-4 flex justify-between items-center hover:bg-[#374151] cursor-pointer">
                <span className="text-sm font-medium text-gray-300">
                  Moneda
                </span>
                <span className="text-xs text-gray-500">ARS {">"}</span>
              </div>
            </div>

            <button
              onClick={handleSignOut}
              className="w-full bg-red-500/10 border border-red-500/30 text-red-500 font-bold py-4 rounded-xl mt-6 flex justify-center items-center gap-2 hover:bg-red-500/20 transition-all"
            >
              <LogOut size={20} /> Cerrar Sesión
            </button>
          </div>
        )}
      </div>

      {/* MENÚ INFERIOR */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#1F2937] border-t border-gray-800 flex justify-around p-2 pb-safe z-50">
        <button
          onClick={() => setActiveTab("resumen")}
          className={`flex flex-col items-center p-2 transition-colors ${
            activeTab === "resumen"
              ? "text-cyan-400"
              : "text-gray-500 hover:text-gray-400"
          }`}
        >
          <Wallet size={24} />
          <span className="text-[10px] mt-1 font-bold">Resumen</span>
        </button>
        <button
          onClick={() => setActiveTab("estrategias")}
          className={`flex flex-col items-center p-2 transition-colors ${
            activeTab === "estrategias"
              ? "text-cyan-400"
              : "text-gray-500 hover:text-gray-400"
          }`}
        >
          <TrendingDown size={24} />
          <span className="text-[10px] mt-1 font-bold">Estrategias</span>
        </button>
        <button
          onClick={() => setActiveTab("agregar")}
          className="flex flex-col items-center justify-center bg-cyan-500 text-slate-950 rounded-full w-14 h-14 -mt-6 shadow-[0_0_15px_rgba(6,182,212,0.4)] border-4 border-[#111827]"
        >
          <PlusCircle size={28} />
        </button>
        <button
          onClick={() => setActiveTab("seguimiento")}
          className={`flex flex-col items-center p-2 transition-colors ${
            activeTab === "seguimiento"
              ? "text-cyan-400"
              : "text-gray-500 hover:text-gray-400"
          }`}
        >
          <ListTodo size={24} />
          <span className="text-[10px] mt-1 font-bold">Deudas</span>
        </button>
        <button
          onClick={() => setActiveTab("ajustes")}
          className={`flex flex-col items-center p-2 transition-colors ${
            activeTab === "ajustes"
              ? "text-cyan-400"
              : "text-gray-500 hover:text-gray-400"
          }`}
        >
          <Settings size={24} />
          <span className="text-[10px] mt-1 font-bold">Ajustes</span>
        </button>
      </div>
    </div>
  );
}
