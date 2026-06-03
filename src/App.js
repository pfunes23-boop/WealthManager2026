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
} from "firebase/auth";
import {
  PlusCircle,
  Wallet,
  Settings,
  ListTodo,
  BarChart3,
  Users,
  Building,
  Car,
  Coffee,
  Plane,
  Home,
  CreditCard,
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
  const [activeTab, setActiveTab] = useState("agregar"); // Empezamos en agregar para probar el form
  const [debts, setDebts] = useState([]);

  // ESTADOS DEL NUEVO FORMULARIO ESTILO TINYDEBT
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

  // ESTADOS DEL FRASCO COMPARTIDO
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
      collection(db, `users/${uid}/debts`),
      orderBy("createdAt", "desc")
    );
    const snapshotTx = await getDocs(qTx);
    setDebts(snapshotTx.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
  };

  const handleAddDebt = async (e) => {
    e.preventDefault();
    if (!user) return;

    // Cálculo interno para el Frasco Compartido
    const myResponsibilityRatio = isShared ? parseFloat(myPercentage) / 100 : 1;
    const finalOriginalAmount =
      parseFloat(originalAmount) * myResponsibilityRatio;
    const finalCurrentBalance = currentBalance
      ? parseFloat(currentBalance) * myResponsibilityRatio
      : finalOriginalAmount;
    const finalMinPayment = parseFloat(minPayment) * myResponsibilityRatio;

    const newDebt = {
      name: debtName,
      category: selectedCategory,
      originalAmount: parseFloat(originalAmount), // Guardamos el total real del frasco
      currentBalance: parseFloat(currentBalance || originalAmount),
      myResponsibilityAmount: finalCurrentBalance, // Lo que me toca pagar a mi
      currency: currency,
      apr: parseFloat(apr),
      minPayment: finalMinPayment,
      durationMonths: parseInt(durationMonths),
      dueDay: parseInt(dueDay),
      isShared: isShared,
      myPercentage: isShared ? parseFloat(myPercentage) : 100,
      createdAt: new Date().toISOString(),
      status: "active",
    };

    const docRef = await addDoc(
      collection(db, `users/${user.uid}/debts`),
      newDebt
    );
    setDebts([{ id: docRef.id, ...newDebt }, ...debts]);

    // Limpiar formulario
    setDebtName("");
    setOriginalAmount("");
    setCurrentBalance("");
    setMinPayment("");
    alert("¡Deuda registrada con éxito en tu base de datos!");
    setActiveTab("resumen");
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center p-6 font-sans">
        <h1 className="text-3xl font-black text-white mb-8">Wealth Manager</h1>
        <button
          onClick={loginWithGoogle}
          className="w-full bg-white text-[#0F172A] font-bold py-4 rounded-xl flex items-center justify-center gap-3"
        >
          Continuar con Google
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#111827] text-slate-100 font-sans pb-24">
      {/* HEADER TIPO TINYDEBT */}
      <div className="bg-[#1F2937] p-4 sticky top-0 z-10 border-b border-gray-800 flex justify-between items-center shadow-md">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            {activeTab === "agregar"
              ? "Añadir Deuda"
              : activeTab === "resumen"
              ? "¡Hola!"
              : activeTab.toUpperCase()}
          </h2>
          {activeTab === "resumen" && (
            <p className="text-xs text-gray-400">Su resumen de finanzas</p>
          )}
        </div>
        <div className="w-10 h-10 bg-cyan-900 rounded-full flex items-center justify-center text-cyan-400 font-bold border border-cyan-700">
          {user.displayName ? user.displayName.charAt(0).toUpperCase() : "U"}
        </div>
      </div>

      <div className="p-4">
        {/* PESTAÑA AGREGAR - CLON UI TINYDEBT */}
        {activeTab === "agregar" && (
          <form onSubmit={handleAddDebt} className="space-y-5 animate-fade-in">
            {/* SECCIÓN 1: DATOS BÁSICOS */}
            <div className="bg-[#1F2937] p-5 rounded-2xl border border-gray-800 shadow-lg space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">
                  Nombre de la Deuda *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. Tarjeta Naranja, Alquiler..."
                  value={debtName}
                  onChange={(e) => setDebtName(e.target.value)}
                  className="w-full bg-[#374151] border border-gray-600 rounded-xl p-3.5 text-white focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">
                  Categoría
                </label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => (
                    <button
                      type="button"
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                        selectedCategory === cat
                          ? "bg-cyan-600 text-white shadow-md"
                          : "bg-[#374151] text-gray-300 hover:bg-gray-600"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* SECCIÓN 2: FRASCO COMPARTIDO */}
            <div className="bg-[#1F2937] p-5 rounded-2xl border border-gray-800 shadow-lg space-y-4">
              <div className="flex justify-between items-center border-b border-gray-700 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-cyan-400 flex items-center gap-2">
                    <Users size={16} /> Frasco Compartido
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    Dividí esta deuda con otra persona
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={isShared}
                    onChange={() => setIsShared(!isShared)}
                  />
                  <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                </label>
              </div>

              {isShared && (
                <div className="pt-2 animate-fade-in">
                  <label className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-1 block">
                    Porcentaje a tu cargo (%)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={myPercentage}
                      onChange={(e) => setMyPercentage(e.target.value)}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                    <span className="bg-[#374151] px-3 py-2 rounded-lg font-mono text-amber-400 font-bold border border-amber-900 w-20 text-center">
                      {myPercentage}%
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* SECCIÓN 3: NÚMEROS Y FINANZAS */}
            <div className="bg-[#1F2937] p-5 rounded-2xl border border-gray-800 shadow-lg space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">
                    Total Original *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-3.5 text-gray-400 font-bold">
                      $
                    </span>
                    <input
                      type="number"
                      required
                      value={originalAmount}
                      onChange={(e) => setOriginalAmount(e.target.value)}
                      className="w-full bg-[#374151] border border-gray-600 rounded-xl p-3.5 pl-8 text-white focus:ring-2 focus:ring-cyan-500 outline-none font-mono text-lg"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">
                    Saldo Actual
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-3.5 text-gray-400 font-bold">
                      $
                    </span>
                    <input
                      type="number"
                      placeholder="Igual al original"
                      value={currentBalance}
                      onChange={(e) => setCurrentBalance(e.target.value)}
                      className="w-full bg-[#374151] border border-gray-600 rounded-xl p-3.5 pl-8 text-white focus:ring-2 focus:ring-cyan-500 outline-none font-mono text-lg"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">
                    Tasa de Interés
                  </label>
                  <div className="relative">
                    <span className="absolute right-3 top-3.5 text-gray-400 font-bold">
                      %
                    </span>
                    <input
                      type="number"
                      step="0.1"
                      value={apr}
                      onChange={(e) => setApr(e.target.value)}
                      className="w-full bg-[#374151] border border-gray-600 rounded-xl p-3.5 pr-8 text-white focus:ring-2 focus:ring-cyan-500 outline-none font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">
                    Pago Mínimo *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-3.5 text-gray-400 font-bold">
                      $
                    </span>
                    <input
                      type="number"
                      required
                      value={minPayment}
                      onChange={(e) => setMinPayment(e.target.value)}
                      className="w-full bg-[#374151] border border-gray-600 rounded-xl p-3.5 pl-8 text-white focus:ring-2 focus:ring-cyan-500 outline-none font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* SECCIÓN 4: TIEMPO */}
            <div className="bg-[#1F2937] p-5 rounded-2xl border border-gray-800 shadow-lg space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">
                    Plazo (Meses)
                  </label>
                  <div className="relative">
                    <span className="absolute right-3 top-3.5 text-gray-400 text-xs">
                      meses
                    </span>
                    <input
                      type="number"
                      value={durationMonths}
                      onChange={(e) => setDurationMonths(e.target.value)}
                      className="w-full bg-[#374151] border border-gray-600 rounded-xl p-3.5 pr-14 text-white focus:ring-2 focus:ring-cyan-500 outline-none font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">
                    Día Vencimiento
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={dueDay}
                    onChange={(e) => setDueDay(e.target.value)}
                    className="w-full bg-[#374151] border border-gray-600 rounded-xl p-3.5 text-white focus:ring-2 focus:ring-cyan-500 outline-none font-mono text-center"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-cyan-500 text-slate-950 font-black py-4 rounded-xl mt-6 flex justify-center items-center gap-2 hover:bg-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all"
            >
              <PlusCircle size={22} /> Guardar Deuda en el Sistema
            </button>
          </form>
        )}

        {/* PESTAÑAS EN CONSTRUCCIÓN PARA LA FASE 2 Y 3 */}
        {activeTab === "resumen" && (
          <div className="bg-[#1F2937] p-8 rounded-2xl border border-gray-800 shadow-lg text-center mt-10">
            <h3 className="text-xl font-bold text-cyan-400 mb-2">
              ¡Formulario Fase 1 Listo!
            </h3>
            <p className="text-gray-400 text-sm mb-4">
              Ya podés cargar deudas complejas en la base de datos. Tenés{" "}
              {debts.length} deudas registradas.
            </p>
            <p className="text-xs text-amber-500 border border-amber-900 bg-amber-900/20 p-3 rounded-lg">
              Próximo paso: Armar el Dashboard Visual estilo TinyDebt.
            </p>
          </div>
        )}
        {activeTab === "estadisticas" && (
          <div className="p-4 text-center text-slate-500 py-12">
            Sección Estrategias y Gráficos (Próximamente)
          </div>
        )}
        {activeTab === "deseos" && (
          <div className="p-4 text-center text-slate-500 py-12">
            Sección Seguimiento (Próximamente)
          </div>
        )}
        {activeTab === "perfil" && (
          <div className="p-4 text-center text-slate-500 py-12">
            Ajustes (Próximamente)
          </div>
        )}
      </div>

      {/* MENÚ INFERIOR ESTILO TINYDEBT */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#1F2937] border-t border-gray-800 flex justify-around p-2 pb-safe z-50">
        <button
          onClick={() => setActiveTab("resumen")}
          className={`flex flex-col items-center p-2 transition-colors ${
            activeTab === "resumen"
              ? "text-cyan-400"
              : "text-gray-500 hover:text-gray-400"
          }`}
        >
          <Wallet size={24} strokeWidth={activeTab === "resumen" ? 2.5 : 2} />
          <span className="text-[10px] mt-1 font-bold">Resumen</span>
        </button>
        <button
          onClick={() => setActiveTab("estadisticas")}
          className={`flex flex-col items-center p-2 transition-colors ${
            activeTab === "estadisticas"
              ? "text-cyan-400"
              : "text-gray-500 hover:text-gray-400"
          }`}
        >
          <BarChart3
            size={24}
            strokeWidth={activeTab === "estadisticas" ? 2.5 : 2}
          />
          <span className="text-[10px] mt-1 font-bold">Estrategias</span>
        </button>

        {/* BOTÓN FLOTANTE CENTRAL DE AÑADIR */}
        <button
          onClick={() => setActiveTab("agregar")}
          className="flex flex-col items-center justify-center bg-cyan-500 text-slate-950 rounded-full w-14 h-14 -mt-6 shadow-[0_0_15px_rgba(6,182,212,0.4)] border-4 border-[#111827] hover:scale-105 transition-transform"
        >
          <PlusCircle size={28} strokeWidth={2.5} />
        </button>

        <button
          onClick={() => setActiveTab("deseos")}
          className={`flex flex-col items-center p-2 transition-colors ${
            activeTab === "deseos"
              ? "text-cyan-400"
              : "text-gray-500 hover:text-gray-400"
          }`}
        >
          <ListTodo size={24} strokeWidth={activeTab === "deseos" ? 2.5 : 2} />
          <span className="text-[10px] mt-1 font-bold">Deudas</span>
        </button>
        <button
          onClick={() => setActiveTab("perfil")}
          className={`flex flex-col items-center p-2 transition-colors ${
            activeTab === "perfil"
              ? "text-cyan-400"
              : "text-gray-500 hover:text-gray-400"
          }`}
        >
          <Settings size={24} strokeWidth={activeTab === "perfil" ? 2.5 : 2} />
          <span className="text-[10px] mt-1 font-bold">Ajustes</span>
        </button>
      </div>
    </div>
  );
}
