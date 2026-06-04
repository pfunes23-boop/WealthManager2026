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
  where,
  arrayUnion,
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
  BarChart3,
  Users,
  Target,
  Trash2,
  ArrowUpCircle,
  ArrowDownCircle,
  CheckCircle2,
  Copy,
} from "lucide-react";

const firebaseConfig = {
  apiKey: "AIzaSyBYVIGc_yowtVcfpRbZrIXLxQHIO4PV_84",
  authDomain: "wealthmanager2026-18f2c.firebaseapp.com",
  projectId: "wealthmanager2026-18f2c",
  storageBucket: "wealthmanager2026-18f2c.firebasestorage.app",
  messagingSenderId: "48794626488",
  appId: "1:48794626488:web:ddfe4d3ddc77f574a9074d",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export default function WealthManager() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("resumen");

  // ESTADOS DE DATOS
  const [records, setRecords] = useState([]); // Personales (Ingresos y Gastos)
  const [jars, setJars] = useState([]); // Frascos a los que pertenezco
  const [sharedDebts, setSharedDebts] = useState([]); // Deudas dentro de los frascos

  // ESTADOS FORMULARIO GENERAL
  const [isIncome, setIsIncome] = useState(false);
  const [name, setName] = useState("");
  const categories = [
    "Sueldo",
    "Ventas",
    "Tarjeta de Crédito",
    "Préstamo",
    "Hogar",
    "Vehículo",
    "Viajes",
    "Servicios",
  ];
  const [category, setCategory] = useState(categories[2]);
  const [amount, setAmount] = useState("");
  const [installments, setInstallments] = useState("1");
  const [paymentInput, setPaymentInput] = useState({});

  // ESTADOS MULTIJUGADOR (FRASCOS)
  const [isShared, setIsShared] = useState(false);
  const [selectedJarId, setSelectedJarId] = useState("");
  const [newJarName, setNewJarName] = useState("");
  const [joinCode, setJoinCode] = useState("");

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
    // 1. Cargar Finanzas Personales
    const qPersonal = query(
      collection(db, `users/${uid}/finances`),
      orderBy("createdAt", "desc")
    );
    const snapPersonal = await getDocs(qPersonal);
    setRecords(snapPersonal.docs.map((d) => ({ id: d.id, ...d.data() })));

    // 2. Cargar Frascos del Usuario
    const qJars = query(
      collection(db, `shared_jars`),
      where("members", "array-contains", uid)
    );
    const snapJars = await getDocs(qJars);
    const loadedJars = snapJars.docs.map((d) => ({ id: d.id, ...d.data() }));
    setJars(loadedJars);

    // 3. Cargar Deudas de esos Frascos
    if (loadedJars.length > 0) {
      const jarIds = loadedJars.map((j) => j.id);
      const qShared = query(
        collection(db, `shared_debts`),
        where("jarId", "in", jarIds)
      );
      const snapShared = await getDocs(qShared);
      setSharedDebts(snapShared.docs.map((d) => ({ id: d.id, ...d.data() })));
    }
  };

  // -------------------------------------------------------------
  // LÓGICA DE FRASCOS COMPARTIDOS (MODO MULTIJUGADOR)
  // -------------------------------------------------------------
  const handleCreateJar = async (e) => {
    e.preventDefault();
    if (!newJarName) return;
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const newJar = {
      name: newJarName,
      code,
      members: [user.uid],
      createdAt: new Date().toISOString(),
    };
    const docRef = await addDoc(collection(db, `shared_jars`), newJar);
    setJars([{ id: docRef.id, ...newJar }, ...jars]);
    setNewJarName("");
    alert(`¡Frasco creado! Código de invitación: ${code}`);
  };

  const handleJoinJar = async (e) => {
    e.preventDefault();
    if (!joinCode) return;
    const q = query(
      collection(db, `shared_jars`),
      where("code", "==", joinCode.toUpperCase())
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const jarDoc = snap.docs[0];
      await updateDoc(jarDoc.ref, { members: arrayUnion(user.uid) });
      setJars([
        {
          id: jarDoc.id,
          ...jarDoc.data(),
          members: [...jarDoc.data().members, user.uid],
        },
        ...jars,
      ]);
      setJoinCode("");
      alert("¡Te uniste al frasco exitosamente!");
    } else {
      alert("Código inválido o frasco inexistente.");
    }
  };

  // -------------------------------------------------------------
  // LÓGICA DE AÑADIR DEUDA / INGRESO
  // -------------------------------------------------------------
  const handleSaveRecord = async (e) => {
    e.preventDefault();
    if (!user) return;

    const finalAmount = parseFloat(amount);
    const monthlyMin = isIncome ? 0 : finalAmount / parseInt(installments);

    const recordData = {
      name,
      category: isIncome ? "Ingreso" : category,
      originalAmount: finalAmount,
      currentBalance: isIncome ? 0 : finalAmount,
      monthlyMin,
      installments: parseInt(installments),
      createdAt: new Date().toISOString(),
      status: "active",
      creatorId: user.uid,
    };

    if (!isIncome && isShared && selectedJarId) {
      // Guardar como deuda compartida
      recordData.jarId = selectedJarId;
      const docRef = await addDoc(collection(db, `shared_debts`), recordData);
      setSharedDebts([{ id: docRef.id, ...recordData }, ...sharedDebts]);
    } else {
      // Guardar como personal (Ingreso o Deuda)
      recordData.type = isIncome ? "income" : "debt";
      const docRef = await addDoc(
        collection(db, `users/${user.uid}/finances`),
        recordData
      );
      setRecords([{ id: docRef.id, ...recordData }, ...records]);
    }

    setName("");
    setAmount("");
    setInstallments("1");
    setIsShared(false);
    setActiveTab(isShared ? "frascos" : "resumen");
  };

  // -------------------------------------------------------------
  // MOTOR DE PAGOS
  // -------------------------------------------------------------
  const handlePay = async (record, isSharedDebt = false) => {
    const payAmt = parseFloat(paymentInput[record.id]);
    if (!payAmt || payAmt <= 0) return;

    const newBalance = Math.max(0, record.currentBalance - payAmt);
    const updateData = {
      currentBalance: newBalance,
      status: newBalance === 0 ? "paid" : "active",
    };

    if (isSharedDebt) {
      await updateDoc(doc(db, `shared_debts`, record.id), updateData);
      setSharedDebts(
        sharedDebts.map((r) =>
          r.id === record.id ? { ...r, ...updateData } : r
        )
      );
    } else {
      await updateDoc(
        doc(db, `users/${user.uid}/finances`, record.id),
        updateData
      );
      setRecords(
        records.map((r) => (r.id === record.id ? { ...r, ...updateData } : r))
      );
    }
    setPaymentInput({ ...paymentInput, [record.id]: "" });
  };

  const handleDelete = async (id, isSharedDebt = false) => {
    if (!window.confirm("¿Eliminar este registro?")) return;
    if (isSharedDebt) {
      await deleteDoc(doc(db, `shared_debts`, id));
      setSharedDebts(sharedDebts.filter((r) => r.id !== id));
    } else {
      await deleteDoc(doc(db, `users/${user.uid}/finances`, id));
      setRecords(records.filter((r) => r.id !== id));
    }
  };

  // -------------------------------------------------------------
  // MATEMÁTICA Y GRÁFICOS DEL ECOSISTEMA
  // -------------------------------------------------------------
  const incomes = records
    .filter((r) => r.type === "income")
    .reduce((acc, r) => acc + r.originalAmount, 0);
  const activeDebts = records.filter(
    (r) => r.type === "debt" && r.status === "active"
  );

  const totalDebtBalance = activeDebts.reduce(
    (acc, r) => acc + r.currentBalance,
    0
  );
  const totalOriginalDebt = records
    .filter((r) => r.type === "debt")
    .reduce((acc, r) => acc + r.originalAmount, 0);

  const netBalance = incomes - (totalOriginalDebt - totalDebtBalance);
  const porcentajePagado =
    totalOriginalDebt > 0
      ? ((totalOriginalDebt - totalDebtBalance) / totalOriginalDebt) * 100
      : 0;

  const projectionData = [
    {
      label: "Mes 1",
      amt: activeDebts.reduce((acc, d) => acc + d.monthlyMin, 0),
    },
    {
      label: "Mes 2",
      amt: activeDebts.reduce(
        (acc, d) => acc + (d.installments >= 2 ? d.monthlyMin : 0),
        0
      ),
    },
    {
      label: "Mes 3",
      amt: activeDebts.reduce(
        (acc, d) => acc + (d.installments >= 3 ? d.monthlyMin : 0),
        0
      ),
    },
    {
      label: "Mes 4",
      amt: activeDebts.reduce(
        (acc, d) => acc + (d.installments >= 4 ? d.monthlyMin : 0),
        0
      ),
    },
  ];
  const maxProj = Math.max(...projectionData.map((p) => p.amt), 1);

  if (!user)
    return (
      <div className="min-h-screen bg-[#0F172A] flex justify-center items-center p-6">
        <button
          onClick={loginWithGoogle}
          className="bg-white text-black p-4 rounded-xl font-bold w-full"
        >
          Ingresar con Google
        </button>
      </div>
    );

  return (
    <div className="min-h-screen bg-[#111827] text-slate-100 pb-24 font-sans">
      <div className="bg-[#1F2937] p-5 sticky top-0 z-10 border-b border-gray-800 shadow-md flex justify-between items-center">
        <h2 className="text-xl font-bold text-white capitalize">{activeTab}</h2>
        <div className="w-8 h-8 bg-cyan-900 rounded-full flex items-center justify-center text-cyan-400 font-bold border border-cyan-700">
          {user.displayName?.charAt(0)}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* ================= RESUMEN GLOBAL ================= */}
        {activeTab === "resumen" && (
          <div className="space-y-4 animate-fade-in">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#1F2937] rounded-2xl p-4 border border-gray-800 shadow-lg">
                <h3 className="text-gray-400 text-xs mb-1 uppercase tracking-wide">
                  Saldo Líquido
                </h3>
                <p
                  className={`text-2xl font-black ${
                    netBalance >= 0 ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  ${netBalance.toLocaleString("es-AR")}
                </p>
                <span className="text-[10px] text-gray-500">
                  Ingresos - Pagos
                </span>
              </div>
              <div className="bg-[#1F2937] rounded-2xl p-4 border border-gray-800 shadow-lg">
                <h3 className="text-gray-400 text-xs mb-1 uppercase tracking-wide">
                  Deuda Personal
                </h3>
                <p className="text-2xl font-black text-rose-400">
                  ${totalDebtBalance.toLocaleString("es-AR")}
                </p>
                <span className="text-[10px] text-gray-500">
                  Saldo Restante
                </span>
              </div>
            </div>

            <div className="bg-[#1F2937] p-5 rounded-2xl border border-gray-800 flex justify-between items-center shadow-lg">
              <div>
                <p className="text-xs text-gray-400">
                  Progreso Total (Personal)
                </p>
                <p className="text-2xl font-black text-cyan-400">
                  {Math.round(porcentajePagado)}% Pagado
                </p>
              </div>
              <div className="relative w-20 h-20">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="40"
                    cy="40"
                    r="34"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    className="text-gray-700"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="34"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={213}
                    strokeDashoffset={213 - (porcentajePagado / 100) * 213}
                    className="text-cyan-500 transition-all duration-1000"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>

            <h3 className="font-bold text-gray-300 mt-6">Tus Deudas Activas</h3>
            {activeDebts.length === 0 && (
              <p className="text-sm text-emerald-500 text-center py-4">
                ¡No tenés deudas personales activas!
              </p>
            )}
            {activeDebts.map((d) => (
              <div
                key={d.id}
                className="bg-[#1F2937] p-4 rounded-xl border border-gray-800 flex flex-col gap-3 shadow-md"
              >
                <div className="flex justify-between">
                  <div>
                    <p className="font-bold">{d.name}</p>
                    <p className="text-xs text-gray-400">
                      {d.category} • Cuota de {d.installments}
                    </p>
                  </div>
                  <p className="font-bold text-rose-400">
                    ${d.currentBalance.toLocaleString("es-AR")}
                  </p>
                </div>
                <div className="flex gap-2 mt-2">
                  <input
                    type="number"
                    placeholder={`Mín: $${d.monthlyMin.toLocaleString(
                      "es-AR"
                    )}`}
                    onChange={(e) =>
                      setPaymentInput({
                        ...paymentInput,
                        [d.id]: e.target.value,
                      })
                    }
                    className="w-full bg-[#111827] border border-gray-700 rounded-lg px-3 text-sm text-white focus:ring-1 focus:ring-cyan-500 outline-none"
                  />
                  <button
                    onClick={() => handlePay(d, false)}
                    className="bg-cyan-600 px-4 py-2 rounded-lg text-xs font-bold shadow hover:bg-cyan-500"
                  >
                    Abonar
                  </button>
                  <button
                    onClick={() => handleDelete(d.id, false)}
                    className="bg-red-500/10 text-red-500 px-3 rounded-lg hover:bg-red-500/20"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ================= GRÁFICOS Y ANÁLISIS ================= */}
        {activeTab === "gráficos" && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-[#1F2937] p-5 rounded-2xl border border-gray-800 shadow-lg">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">
                Proyección Mensual (Cuotas)
              </h3>
              <div className="flex justify-around items-end h-40 border-b border-gray-700 pb-2">
                {projectionData.map((p, i) => (
                  <div
                    key={i}
                    className="flex flex-col items-center w-1/5 group"
                  >
                    <span className="text-[10px] text-cyan-400 mb-1 opacity-0 group-hover:opacity-100 transition-all font-mono">
                      ${Math.round(p.amt).toLocaleString("es-AR")}
                    </span>
                    <div
                      style={{
                        height: `${Math.max((p.amt / maxProj) * 100, 5)}%`,
                      }}
                      className="w-full bg-cyan-600 rounded-t-sm hover:bg-cyan-400 transition-colors"
                    ></div>
                    <span className="text-[10px] text-gray-400 mt-2 font-bold">
                      {p.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#1F2937] p-5 rounded-2xl border border-gray-800 shadow-lg space-y-5">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">
                Balance Histórico
              </h3>
              <div className="flex items-center gap-4">
                <ArrowUpCircle className="text-emerald-500" size={32} />
                <div>
                  <p className="text-xs text-gray-400">
                    Total Ingresos Registrados
                  </p>
                  <p className="font-bold text-emerald-400">
                    ${incomes.toLocaleString("es-AR")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <ArrowDownCircle className="text-rose-500" size={32} />
                <div>
                  <p className="text-xs text-gray-400">Total Deuda Adquirida</p>
                  <p className="font-bold text-rose-400">
                    ${totalOriginalDebt.toLocaleString("es-AR")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= FRASCOS COMPARTIDOS (NUEVO MOTOR) ================= */}
        {activeTab === "frascos" && (
          <div className="space-y-5 animate-fade-in">
            {/* PANEL DE CONEXIÓN */}
            <div className="grid grid-cols-2 gap-4">
              <form
                onSubmit={handleCreateJar}
                className="bg-gradient-to-br from-amber-600 to-amber-800 p-4 rounded-2xl shadow-lg border border-amber-500/50"
              >
                <h3 className="font-bold text-white text-sm mb-2">
                  Crear Frasco
                </h3>
                <input
                  type="text"
                  placeholder="Ej: Viaje Bariloche"
                  value={newJarName}
                  onChange={(e) => setNewJarName(e.target.value)}
                  className="w-full bg-black/20 border border-amber-400/30 rounded-lg p-2 text-white text-xs mb-2 outline-none"
                />
                <button
                  type="submit"
                  className="w-full bg-amber-500 text-amber-950 font-bold text-xs py-2 rounded-lg shadow"
                >
                  Generar Código
                </button>
              </form>

              <form
                onSubmit={handleJoinJar}
                className="bg-[#1F2937] p-4 rounded-2xl shadow-lg border border-gray-700"
              >
                <h3 className="font-bold text-cyan-400 text-sm mb-2">
                  Unirse a Frasco
                </h3>
                <input
                  type="text"
                  placeholder="Código de 6 letras"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  className="w-full bg-[#111827] border border-gray-600 rounded-lg p-2 text-white text-xs mb-2 outline-none font-mono uppercase"
                />
                <button
                  type="submit"
                  className="w-full bg-cyan-600 text-white font-bold text-xs py-2 rounded-lg shadow"
                >
                  Conectar
                </button>
              </form>
            </div>

            {/* LISTA DE FRASCOS Y SUS DEUDAS */}
            {jars.length === 0 ? (
              <p className="text-center text-gray-500 py-10">
                No estás conectado a ningún frasco compartido.
              </p>
            ) : (
              jars.map((jar) => {
                const jarDebts = sharedDebts.filter((d) => d.jarId === jar.id);
                const jarTotal = jarDebts.reduce(
                  (acc, d) => acc + d.currentBalance,
                  0
                );

                return (
                  <div
                    key={jar.id}
                    className="bg-[#1F2937] p-5 rounded-2xl border border-amber-500/30 shadow-xl relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-bold text-white text-lg">
                          {jar.name}
                        </h4>
                        <p className="text-xs text-gray-400 mt-0.5">
                          ID:{" "}
                          <span className="font-mono bg-black/30 px-1 rounded text-amber-400">
                            {jar.code}
                          </span>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-gray-500 uppercase">
                          Deuda del Frasco
                        </p>
                        <p className="font-black text-amber-400">
                          ${jarTotal.toLocaleString("es-AR")}
                        </p>
                      </div>
                    </div>

                    {jarDebts.map((d) => (
                      <div
                        key={d.id}
                        className={`p-3 rounded-xl mt-2 flex flex-col gap-2 ${
                          d.status === "paid"
                            ? "bg-emerald-900/20 border border-emerald-500/20"
                            : "bg-[#111827] border border-gray-700"
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span
                            className={`text-sm font-bold ${
                              d.status === "paid"
                                ? "text-emerald-500 line-through"
                                : "text-white"
                            }`}
                          >
                            {d.name}
                          </span>
                          <span
                            className={`text-sm font-mono ${
                              d.status === "paid"
                                ? "text-emerald-500"
                                : "text-rose-400"
                            }`}
                          >
                            ${d.currentBalance.toLocaleString("es-AR")}
                          </span>
                        </div>
                        {d.status === "active" && (
                          <div className="flex gap-2">
                            <input
                              type="number"
                              placeholder="Pago conjunto..."
                              onChange={(e) =>
                                setPaymentInput({
                                  ...paymentInput,
                                  [d.id]: e.target.value,
                                })
                              }
                              className="w-full bg-[#1F2937] border border-gray-600 rounded-lg px-2 text-xs text-white"
                            />
                            <button
                              onClick={() => handlePay(d, true)}
                              className="bg-amber-600 px-3 py-1.5 rounded-lg text-xs font-bold text-white"
                            >
                              Abonar
                            </button>
                            <button
                              onClick={() => handleDelete(d.id, true)}
                              className="bg-red-500/10 text-red-500 px-2 rounded-lg"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ================= AGREGAR (FORMULARIO INTELIGENTE) ================= */}
        {activeTab === "agregar" && (
          <form
            onSubmit={handleSaveRecord}
            className="space-y-5 animate-fade-in"
          >
            <div className="flex bg-[#1F2937] p-1 rounded-xl border border-gray-800">
              <button
                type="button"
                onClick={() => setIsIncome(false)}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${
                  !isIncome
                    ? "bg-rose-500 text-white shadow-md"
                    : "text-gray-500"
                }`}
              >
                Deuda / Gasto
              </button>
              <button
                type="button"
                onClick={() => setIsIncome(true)}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${
                  isIncome
                    ? "bg-emerald-500 text-white shadow-md"
                    : "text-gray-500"
                }`}
              >
                Ingreso
              </button>
            </div>

            <div className="bg-[#1F2937] p-5 rounded-2xl border border-gray-800 shadow-lg space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">
                  Concepto *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Sueldo, Tarjeta, Compra..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#374151] border border-gray-600 rounded-xl p-3.5 text-white outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">
                  Monto Total *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-3.5 text-gray-400 font-bold">
                    $
                  </span>
                  <input
                    type="number"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-[#374151] border border-gray-600 rounded-xl p-3.5 pl-8 text-white font-mono text-lg outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
              </div>

              {!isIncome && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">
                        Categoría
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full bg-[#374151] border border-gray-600 rounded-xl p-3.5 text-white text-sm outline-none"
                      >
                        {categories
                          .filter((c) => c !== "Sueldo" && c !== "Ventas")
                          .map((c) => (
                            <option key={c}>{c}</option>
                          ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">
                        Cuotas
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={installments}
                        onChange={(e) => setInstallments(e.target.value)}
                        className="w-full bg-[#374151] border border-gray-600 rounded-xl p-3.5 text-white text-center outline-none"
                      />
                    </div>
                  </div>

                  <div className="border-t border-gray-700 pt-4 mt-2">
                    <label className="flex items-center justify-between text-sm text-amber-400 font-bold cursor-pointer">
                      <span className="flex items-center gap-2">
                        <Users size={16} /> Enviar a Frasco Compartido
                      </span>
                      <input
                        type="checkbox"
                        checked={isShared}
                        onChange={() => setIsShared(!isShared)}
                        className="w-4 h-4 accent-amber-500"
                      />
                    </label>

                    {isShared && (
                      <div className="mt-4 p-3 bg-amber-900/10 border border-amber-500/20 rounded-xl animate-fade-in space-y-3">
                        <select
                          value={selectedJarId}
                          onChange={(e) => setSelectedJarId(e.target.value)}
                          className="w-full bg-[#111827] border border-gray-700 rounded-lg p-2 text-white text-sm"
                          required={isShared}
                        >
                          <option value="">-- Seleccionar Frasco --</option>
                          {jars.map((j) => (
                            <option key={j.id} value={j.id}>
                              {j.name} (Código: {j.code})
                            </option>
                          ))}
                        </select>
                        {jars.length === 0 && (
                          <p className="text-xs text-rose-400">
                            No tenés frascos. Creá uno en la pestaña Frascos
                            primero.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <button
              type="submit"
              className={`w-full font-black py-4 rounded-xl flex justify-center items-center gap-2 shadow-lg transition-transform hover:scale-[1.02] ${
                isIncome
                  ? "bg-emerald-500 text-emerald-950 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                  : "bg-cyan-500 text-cyan-950 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
              }`}
            >
              <PlusCircle size={22} />{" "}
              {isIncome ? "Registrar Ingreso" : "Registrar Deuda"}
            </button>
          </form>
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
          <Wallet size={22} />
          <span className="text-[9px] mt-1 font-bold">Resumen</span>
        </button>
        <button
          onClick={() => setActiveTab("gráficos")}
          className={`flex flex-col items-center p-2 transition-colors ${
            activeTab === "gráficos"
              ? "text-cyan-400"
              : "text-gray-500 hover:text-gray-400"
          }`}
        >
          <BarChart3 size={22} />
          <span className="text-[9px] mt-1 font-bold">Gráficos</span>
        </button>
        <button
          onClick={() => setActiveTab("agregar")}
          className="flex flex-col items-center justify-center bg-cyan-500 text-slate-950 rounded-full w-12 h-12 -mt-4 shadow-[0_0_15px_rgba(6,182,212,0.4)] border-4 border-[#111827] hover:scale-105 transition-transform"
        >
          <PlusCircle size={24} />
        </button>
        <button
          onClick={() => setActiveTab("frascos")}
          className={`flex flex-col items-center p-2 transition-colors ${
            activeTab === "frascos"
              ? "text-amber-400"
              : "text-gray-500 hover:text-gray-400"
          }`}
        >
          <Users size={22} />
          <span className="text-[9px] mt-1 font-bold">Frascos</span>
        </button>
        <button
          onClick={() => signOut(auth).then(() => setUser(null))}
          className="flex flex-col items-center p-2 text-gray-500 hover:text-red-400 transition-colors"
        >
          <Settings size={22} />
          <span className="text-[9px] mt-1 font-bold">Salir</span>
        </button>
      </div>
    </div>
  );
}
