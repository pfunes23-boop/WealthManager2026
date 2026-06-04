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
  Trash2,
  ArrowUpCircle,
  ArrowDownCircle,
  CheckCircle2,
  CalendarDays,
  History,
  LogOut,
  Globe,
  DollarSign,
  DatabaseBackup,
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

  // DATOS
  const [records, setRecords] = useState([]);
  const [jars, setJars] = useState([]);
  const [sharedDebts, setSharedDebts] = useState([]);

  // FORMULARIO (SÚPER MOTOR)
  const [isIncome, setIsIncome] = useState(false);
  const [name, setName] = useState("");
  const defaultCategories = [
    "Sueldo",
    "Ventas",
    "Tarjeta de Crédito",
    "Préstamo",
    "Alquiler",
    "Hogar",
    "Vehículo",
    "Servicios",
    "Viajes",
    "Diversión",
  ];
  const [customCategories, setCustomCategories] = useState([]);
  const [category, setCategory] = useState(defaultCategories[2]);
  const [newCategoryName, setNewCategoryName] = useState("");

  const [amount, setAmount] = useState("");
  const [paymentType, setPaymentType] = useState("cuotas"); // unico, mensual, cuotas
  const [installments, setInstallments] = useState("1");
  const [dueDay, setDueDay] = useState("10");
  const [paymentInput, setPaymentInput] = useState({});

  // MULTIJUGADOR (FRASCOS)
  const [isShared, setIsShared] = useState(false);
  const [selectedJarId, setSelectedJarId] = useState("");
  const [myPercentage, setMyPercentage] = useState("50");
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
    const qPersonal = query(
      collection(db, `users/${uid}/finances`),
      orderBy("createdAt", "desc")
    );
    const snapPersonal = await getDocs(qPersonal);
    setRecords(snapPersonal.docs.map((d) => ({ id: d.id, ...d.data() })));

    const qJars = query(
      collection(db, `shared_jars`),
      where("members", "array-contains", uid)
    );
    const snapJars = await getDocs(qJars);
    const loadedJars = snapJars.docs.map((d) => ({ id: d.id, ...d.data() }));
    setJars(loadedJars);

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

  const handleSaveRecord = async (e) => {
    e.preventDefault();
    if (!user) return;

    let finalCategory = category;
    if (category === "nueva" && newCategoryName.trim() !== "") {
      finalCategory = newCategoryName;
      setCustomCategories([...customCategories, newCategoryName]);
    }

    const finalAmount = parseFloat(amount);
    let finalInstallments =
      paymentType === "unico"
        ? 1
        : paymentType === "mensual"
        ? 999
        : parseInt(installments);
    const monthlyMin = isIncome
      ? 0
      : paymentType === "mensual"
      ? finalAmount
      : finalAmount / finalInstallments;

    const recordData = {
      name,
      category: isIncome ? "Ingreso" : finalCategory,
      originalAmount: finalAmount,
      currentBalance: isIncome
        ? 0
        : paymentType === "mensual"
        ? finalAmount
        : finalAmount,
      monthlyMin,
      installments: finalInstallments,
      paymentType,
      dueDay: parseInt(dueDay),
      createdAt: new Date().toISOString(),
      status: "active",
      creatorId: user.uid,
    };

    if (!isIncome && isShared && selectedJarId) {
      const jar = jars.find((j) => j.id === selectedJarId);
      recordData.jarId = selectedJarId;
      recordData.jarName = jar?.name || "Frasco Compartido";
      recordData.myPercentage = parseFloat(myPercentage);
      recordData.history = [];

      const docRef = await addDoc(collection(db, `shared_debts`), recordData);
      setSharedDebts([{ id: docRef.id, ...recordData }, ...sharedDebts]);
    } else {
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
    setNewCategoryName("");
    setActiveTab(isShared ? "frascos" : "resumen");
  };

  const handlePay = async (record, isSharedDebt = false) => {
    const payAmt = parseFloat(paymentInput[record.id]);
    if (!payAmt || payAmt <= 0) return;

    const pType = record.paymentType || "cuotas"; // PARCHE DE SEGURIDAD
    const newBalance =
      pType === "mensual"
        ? record.currentBalance
        : Math.max(0, record.currentBalance - payAmt);
    const newStatus =
      newBalance === 0 && pType !== "mensual" ? "paid" : "active";

    const paymentLog = {
      userId: user.uid,
      userName: user.displayName || "Usuario",
      amount: payAmt,
      date: new Date().toISOString(),
    };

    if (isSharedDebt) {
      await updateDoc(doc(db, `shared_debts`, record.id), {
        currentBalance: newBalance,
        status: newStatus,
        history: arrayUnion(paymentLog),
      });
      setSharedDebts(
        sharedDebts.map((r) =>
          r.id === record.id
            ? {
                ...r,
                currentBalance: newBalance,
                status: newStatus,
                history: [...(r.history || []), paymentLog],
              }
            : r
        )
      );
    } else {
      await updateDoc(doc(db, `users/${user.uid}/finances`, record.id), {
        currentBalance: newBalance,
        status: newStatus,
      });
      setRecords(
        records.map((r) =>
          r.id === record.id
            ? { ...r, currentBalance: newBalance, status: newStatus }
            : r
        )
      );
    }
    setPaymentInput({ ...paymentInput, [record.id]: "" });
    alert("¡Pago de cuota registrado!");
  };

  const handleDeleteRoot = async (id, isSharedDebt = false) => {
    if (
      !window.confirm(
        "¿Seguro que querés eliminar la deuda original completa? Esto borrará todas las cuotas futuras."
      )
    )
      return;
    if (isSharedDebt) {
      await deleteDoc(doc(db, `shared_debts`, id));
      setSharedDebts(sharedDebts.filter((r) => r.id !== id));
    } else {
      await deleteDoc(doc(db, `users/${user.uid}/finances`, id));
      setRecords(records.filter((r) => r.id !== id));
    }
  };

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
    }
  };

  // -------------------------------------------------------------
  // MOTOR DE PROYECCIÓN DE FECHAS (BLINDADO CONTRA DATOS VIEJOS)
  // -------------------------------------------------------------
  const generateTimeline = () => {
    const timeline = [];
    const today = new Date();

    const addProjections = (debt, isShared) => {
      const myRatio = isShared ? debt.myPercentage / 100 : 1;
      const myBalance = debt.currentBalance * myRatio;

      const pType =
        debt.paymentType || (debt.installments > 1 ? "cuotas" : "unico"); // PARCHE DE SEGURIDAD
      if (myBalance <= 0 && pType !== "mensual") return;

      const startDate = new Date(debt.createdAt || new Date());
      const startMonthOffset =
        (today.getFullYear() - startDate.getFullYear()) * 12 +
        (today.getMonth() - startDate.getMonth());
      let currentInst = Math.max(1, startMonthOffset + 1);

      // Proyectamos hasta 6 meses
      for (let i = 0; i < 6; i++) {
        if (pType === "unico" && i > 0) break;
        if (pType === "cuotas" && currentInst + i > (debt.installments || 1))
          break;

        const projDate = new Date(
          today.getFullYear(),
          today.getMonth() + i,
          debt.dueDay || 10
        );
        let label = "";
        if (pType === "unico") label = "PAGO ÚNICO";
        else if (pType === "mensual") label = "MENSUAL";
        else label = `CUOTA ${currentInst + i}/${debt.installments || 1}`;

        timeline.push({
          id: `${debt.id}-${i}`,
          originalId: debt.id,
          name: debt.name,
          category: debt.category,
          amount: isShared
            ? (debt.monthlyMin || 0) * myRatio
            : debt.monthlyMin || 0,
          dateObj: projDate,
          dateStr: projDate.toLocaleDateString("es-AR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          }),
          label,
          isShared,
          rawDebt: debt,
        });
      }
    };

    records
      .filter((r) => r.type === "debt" && r.status === "active")
      .forEach((d) => addProjections(d, false));
    sharedDebts
      .filter((d) => d.status === "active")
      .forEach((d) => addProjections(d, true));

    return timeline.sort((a, b) => a.dateObj - b.dateObj);
  };

  const upcomingPayments = generateTimeline();

  const incomes = records
    .filter((r) => r.type === "income")
    .reduce((acc, r) => acc + r.originalAmount, 0);
  const activePersonalDebts = records.filter(
    (r) => r.type === "debt" && r.status === "active"
  );
  const activeSharedDebts = sharedDebts.filter((r) => r.status === "active");

  const totalPersonalDebt = activePersonalDebts.reduce(
    (acc, r) => acc + r.currentBalance,
    0
  );
  const mySharedDebt = activeSharedDebts.reduce(
    (acc, r) => acc + r.currentBalance * (r.myPercentage / 100),
    0
  );
  const netBalance = incomes - totalPersonalDebt - mySharedDebt;

  const projChart = [0, 1, 2, 3, 4, 5].map((monthOffset) => {
    const targetDate = new Date(
      new Date().getFullYear(),
      new Date().getMonth() + monthOffset,
      1
    );
    const totalMes = upcomingPayments
      .filter(
        (p) =>
          p.dateObj.getMonth() === targetDate.getMonth() &&
          p.dateObj.getFullYear() === targetDate.getFullYear()
      )
      .reduce((acc, p) => acc + p.amount, 0);
    const mesStr = targetDate.toLocaleDateString("es-ES", { month: "short" });
    return { label: mesStr, amt: totalMes };
  });
  const maxProj = Math.max(...projChart.map((p) => p.amt), 1);

  const allCategories = [...defaultCategories, ...customCategories];

  if (!user)
    return (
      <div className="min-h-screen bg-[#0F172A] flex flex-col justify-center items-center p-6">
        <div className="w-20 h-20 bg-cyan-500 rounded-3xl flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(6,182,212,0.5)]">
          <Wallet size={40} className="text-[#0F172A]" />
        </div>
        <h1 className="text-3xl font-black text-white mb-2 tracking-tight">
          Wealth Manager
        </h1>
        <p className="text-gray-400 text-center mb-10 text-sm">
          Proyecciones, cuotas y frascos compartidos en un solo lugar.
        </p>
        <button
          onClick={loginWithGoogle}
          className="w-full bg-white text-black p-4 rounded-xl font-bold flex justify-center items-center gap-3 hover:bg-gray-200 transition-colors"
        >
          Continuar con Google
        </button>
      </div>
    );

  return (
    <div className="min-h-screen bg-[#111827] text-slate-100 pb-24 font-sans">
      <div className="bg-[#1F2937] p-5 sticky top-0 z-10 border-b border-gray-800 shadow-md flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white capitalize tracking-tight">
            {activeTab}
          </h2>
          {activeTab === "resumen" && (
            <p className="text-xs text-cyan-400 font-bold tracking-widest uppercase mt-1">
              Línea de tiempo
            </p>
          )}
        </div>
        <img
          src={user.photoURL}
          alt="Perfil"
          className="w-10 h-10 rounded-full border-2 border-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.4)] cursor-pointer"
          onClick={() => setActiveTab("perfil")}
        />
      </div>

      <div className="p-4 space-y-4">
        {/* ================= RESUMEN Y LÍNEA DE TIEMPO (TIMELINE) ================= */}
        {activeTab === "resumen" && (
          <div className="space-y-4 animate-fade-in">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#1F2937] rounded-2xl p-4 border border-gray-800 shadow-lg">
                <h3 className="text-gray-400 text-[10px] mb-1 uppercase tracking-wider font-bold">
                  Saldo Líquido Actual
                </h3>
                <p
                  className={`text-2xl font-black ${
                    netBalance >= 0 ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  ${netBalance.toLocaleString("es-AR")}
                </p>
              </div>
              <div className="bg-[#1F2937] rounded-2xl p-4 border border-gray-800 shadow-lg">
                <h3 className="text-gray-400 text-[10px] mb-1 uppercase tracking-wider font-bold">
                  Deuda Restante Proyectada
                </h3>
                <p className="text-2xl font-black text-rose-400">
                  ${(totalPersonalDebt + mySharedDebt).toLocaleString("es-AR")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-6 mb-2">
              <CalendarDays className="text-cyan-400" size={18} />
              <h3 className="font-bold text-white text-lg">
                Próximos Vencimientos
              </h3>
            </div>

            {upcomingPayments.length === 0 ? (
              <p className="text-center text-emerald-500 text-sm py-8 bg-[#1F2937] rounded-xl border border-gray-800">
                No hay pagos proyectados. ¡Estás al día!
              </p>
            ) : (
              <div className="space-y-3">
                {upcomingPayments.map((p, idx) => (
                  <div
                    key={p.id}
                    className={`p-4 rounded-xl border flex flex-col gap-3 shadow-md relative overflow-hidden ${
                      p.isShared
                        ? "bg-amber-900/10 border-amber-500/30"
                        : "bg-[#1F2937] border-gray-800"
                    }`}
                  >
                    {p.isShared && (
                      <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
                    )}

                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-white text-[15px]">
                          {p.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                              p.isShared
                                ? "bg-amber-500/20 text-amber-400"
                                : "bg-cyan-500/20 text-cyan-400"
                            }`}
                          >
                            {p.label}
                          </span>
                          <span className="text-[10px] text-gray-400 flex items-center gap-1">
                            <CalendarDays size={10} /> Vence: {p.dateStr}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={`font-black text-lg ${
                            p.isShared ? "text-amber-400" : "text-rose-400"
                          }`}
                        >
                          ${p.amount.toLocaleString("es-AR")}
                        </p>
                        {p.isShared && (
                          <p className="text-[9px] text-amber-500/70">
                            Tu {p.rawDebt.myPercentage}% de {p.rawDebt.jarName}
                          </p>
                        )}
                      </div>
                    </div>

                    {p.dateObj.getMonth() === new Date().getMonth() &&
                      p.dateObj.getFullYear() === new Date().getFullYear() && (
                        <div className="flex gap-2 mt-1 pt-3 border-t border-gray-700/50">
                          <input
                            type="number"
                            placeholder="Monto a abonar..."
                            onChange={(e) =>
                              setPaymentInput({
                                ...paymentInput,
                                [p.originalId]: e.target.value,
                              })
                            }
                            className={`w-full bg-[#111827] border rounded-lg px-3 text-xs text-white focus:outline-none ${
                              p.isShared
                                ? "border-amber-900/50 focus:ring-1 focus:ring-amber-500"
                                : "border-gray-700 focus:ring-1 focus:ring-cyan-500"
                            }`}
                          />
                          <button
                            onClick={() => handlePay(p.rawDebt, p.isShared)}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold text-white shadow transition-all ${
                              p.isShared
                                ? "bg-amber-600 hover:bg-amber-500"
                                : "bg-cyan-600 hover:bg-cyan-500"
                            }`}
                          >
                            Abonar
                          </button>
                        </div>
                      )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= GRÁFICOS Y ADMINISTRACIÓN DE DEUDAS ================= */}
        {activeTab === "gráficos" && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-[#1F2937] p-5 rounded-2xl border border-gray-800 shadow-lg">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <BarChart3 size={16} /> Proyección Mensual (Próx. 6 Meses)
              </h3>
              <div className="flex justify-around items-end h-48 border-b border-gray-700 pb-2">
                {projChart.map((p, i) => (
                  <div
                    key={i}
                    className="flex flex-col items-center w-1/6 group"
                  >
                    <span className="text-[9px] text-cyan-400 mb-1 opacity-0 group-hover:opacity-100 transition-all font-mono">
                      ${Math.round(p.amt).toLocaleString("es-AR")}
                    </span>
                    <div
                      style={{
                        height: `${Math.max((p.amt / maxProj) * 100, 5)}%`,
                      }}
                      className="w-full bg-gradient-to-t from-cyan-900 to-cyan-500 rounded-t-sm hover:from-cyan-700 hover:to-cyan-400 transition-colors shadow-[0_0_10px_rgba(6,182,212,0.2)]"
                    ></div>
                    <span className="text-[9px] text-gray-400 mt-2 font-bold uppercase">
                      {p.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#1F2937] p-5 rounded-2xl border border-gray-800 shadow-lg">
              <h3 className="text-sm font-bold text-rose-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <DatabaseBackup size={16} /> Gestor de Deudas Originales
              </h3>
              <p className="text-xs text-gray-400 mb-4">
                Desde aquí podés auditar y eliminar el registro original
                completo (borra todas las cuotas futuras de la línea de tiempo).
              </p>

              <div className="space-y-3">
                {[...activePersonalDebts, ...activeSharedDebts].map((d) => (
                  <div
                    key={d.id}
                    className="flex justify-between items-center p-3 bg-[#111827] border border-gray-700 rounded-xl"
                  >
                    <div>
                      <p className="text-sm font-bold text-white">{d.name}</p>
                      <p className="text-[10px] text-gray-500">
                        {d.category} •{" "}
                        {(d.paymentType || "cuotas").toUpperCase()}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="text-xs font-mono text-gray-400">
                        ${d.currentBalance.toLocaleString("es-AR")}
                      </p>
                      <button
                        onClick={() =>
                          handleDeleteRoot(d.id, d.jarId !== undefined)
                        }
                        className="text-gray-600 hover:text-red-500 transition-colors bg-[#1F2937] p-1.5 rounded-lg"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
                {activePersonalDebts.length === 0 &&
                  activeSharedDebts.length === 0 && (
                    <p className="text-xs text-emerald-500 text-center">
                      No hay registros raíz activos.
                    </p>
                  )}
              </div>
            </div>
          </div>
        )}

        {/* ================= FRASCOS COMPARTIDOS Y SU HISTORIAL ================= */}
        {activeTab === "frascos" && (
          <div className="space-y-5 animate-fade-in">
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
                  placeholder="Nombre..."
                  value={newJarName}
                  onChange={(e) => setNewJarName(e.target.value)}
                  className="w-full bg-black/20 border border-amber-400/30 rounded-lg p-2 text-white text-xs mb-2 outline-none"
                />
                <button
                  type="submit"
                  className="w-full bg-amber-500 text-amber-950 font-bold text-xs py-2 rounded-lg shadow hover:bg-amber-400 transition-colors"
                >
                  Generar
                </button>
              </form>
              <form
                onSubmit={handleJoinJar}
                className="bg-[#1F2937] p-4 rounded-2xl shadow-lg border border-gray-700"
              >
                <h3 className="font-bold text-cyan-400 text-sm mb-2">Unirse</h3>
                <input
                  type="text"
                  placeholder="Código..."
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  className="w-full bg-[#111827] border border-gray-600 rounded-lg p-2 text-white text-xs mb-2 outline-none uppercase font-mono"
                />
                <button
                  type="submit"
                  className="w-full bg-cyan-600 text-white font-bold text-xs py-2 rounded-lg shadow hover:bg-cyan-500 transition-colors"
                >
                  Conectar
                </button>
              </form>
            </div>

            {jars.length === 0 ? (
              <p className="text-center text-gray-500 py-10">
                No estás en ningún frasco compartido.
              </p>
            ) : (
              jars.map((jar) => {
                const jarDebts = sharedDebts.filter((d) => d.jarId === jar.id);
                return (
                  <div
                    key={jar.id}
                    className="bg-[#1F2937] p-5 rounded-2xl border border-amber-500/30 shadow-xl relative overflow-hidden"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-black text-white text-xl">
                          {jar.name}
                        </h4>
                        <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                          Código:{" "}
                          <span className="font-mono bg-black/30 px-1.5 py-0.5 rounded text-amber-400">
                            {jar.code}
                          </span>
                        </p>
                      </div>
                      <div className="bg-amber-500/10 p-2 rounded-xl border border-amber-500/20 text-center">
                        <Users
                          size={16}
                          className="text-amber-500 mx-auto mb-1"
                        />
                        <p className="text-[9px] text-amber-400 font-bold">
                          {jar.members.length} Miembros
                        </p>
                      </div>
                    </div>

                    {jarDebts.map((d) => (
                      <div
                        key={d.id}
                        className="p-4 rounded-xl mt-3 bg-[#111827] border border-gray-700"
                      >
                        <div className="flex justify-between items-center border-b border-gray-800 pb-2 mb-2">
                          <span
                            className={`text-[15px] font-bold ${
                              d.status === "paid"
                                ? "text-emerald-500 line-through"
                                : "text-white"
                            }`}
                          >
                            {d.name}
                          </span>
                          <div className="text-right">
                            <span
                              className={`block text-lg font-black ${
                                d.status === "paid"
                                  ? "text-emerald-500"
                                  : "text-amber-400"
                              }`}
                            >
                              ${d.currentBalance.toLocaleString("es-AR")}
                            </span>
                            <span className="text-[9px] text-gray-500">
                              Deuda Total Restante
                            </span>
                          </div>
                        </div>

                        {d.history && d.history.length > 0 && (
                          <div className="bg-black/20 rounded-lg p-2 mt-2 max-h-24 overflow-y-auto">
                            <p className="text-[10px] text-gray-400 uppercase font-bold flex items-center gap-1 mb-1.5">
                              <History size={10} /> Últimos pagos conjuntos:
                            </p>
                            {d.history
                              .slice()
                              .reverse()
                              .map((h, i) => (
                                <div
                                  key={i}
                                  className="flex justify-between items-center text-xs py-1 border-b border-gray-800/50 last:border-0"
                                >
                                  <span className="text-gray-300 font-medium">
                                    {h.userName.split(" ")[0]} abonó:
                                  </span>
                                  <span className="text-emerald-400 font-mono">
                                    +${h.amount.toLocaleString("es-AR")}
                                  </span>
                                </div>
                              ))}
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

        {/* ================= AGREGAR ================= */}
        {activeTab === "agregar" && (
          <form
            onSubmit={handleSaveRecord}
            className="space-y-5 animate-fade-in"
          >
            <div className="flex bg-[#1F2937] p-1 rounded-xl border border-gray-800 shadow-md">
              <button
                type="button"
                onClick={() => setIsIncome(false)}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                  !isIncome
                    ? "bg-rose-500 text-white shadow-lg"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                Deuda / Gasto
              </button>
              <button
                type="button"
                onClick={() => setIsIncome(true)}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                  isIncome
                    ? "bg-emerald-500 text-white shadow-lg"
                    : "text-gray-500 hover:text-gray-300"
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
                        Tipo de Pago
                      </label>
                      <select
                        value={paymentType}
                        onChange={(e) => setPaymentType(e.target.value)}
                        className="w-full bg-[#374151] border border-gray-600 rounded-xl p-3.5 text-white text-sm outline-none"
                      >
                        <option value="unico">Pago Único</option>
                        <option value="mensual">Suscripción Mensual</option>
                        <option value="cuotas">A Cuotas</option>
                      </select>
                    </div>
                    {paymentType === "cuotas" ? (
                      <div>
                        <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">
                          Cant. Cuotas
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={installments}
                          onChange={(e) => setInstallments(e.target.value)}
                          className="w-full bg-[#374151] border border-gray-600 rounded-xl p-3.5 text-white text-center outline-none"
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">
                          Día Vencimiento
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="31"
                          value={dueDay}
                          onChange={(e) => setDueDay(e.target.value)}
                          className="w-full bg-[#374151] border border-gray-600 rounded-xl p-3.5 text-white text-center outline-none"
                        />
                      </div>
                    )}
                  </div>

                  {paymentType === "cuotas" && (
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">
                        Día Vencimiento Mensual
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={dueDay}
                        onChange={(e) => setDueDay(e.target.value)}
                        className="w-full bg-[#374151] border border-gray-600 rounded-xl p-3.5 text-white text-center outline-none"
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">
                      Categoría
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-[#374151] border border-gray-600 rounded-xl p-3.5 text-white text-sm outline-none"
                    >
                      {allCategories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                      <option value="nueva" className="font-bold text-cyan-400">
                        + Añadir Nueva Categoría...
                      </option>
                    </select>
                    {category === "nueva" && (
                      <input
                        type="text"
                        placeholder="Nombre de categoría..."
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        className="w-full bg-[#111827] border border-cyan-700 rounded-xl p-3 mt-2 text-white text-sm outline-none"
                        autoFocus
                      />
                    )}
                  </div>

                  <div className="border-t border-gray-700 pt-4 mt-2">
                    <label className="flex items-center justify-between text-sm text-amber-400 font-bold cursor-pointer bg-amber-900/10 p-3 rounded-xl border border-amber-500/20">
                      <span className="flex items-center gap-2">
                        <Users size={18} /> Enviar a Frasco Compartido
                      </span>
                      <input
                        type="checkbox"
                        checked={isShared}
                        onChange={() => setIsShared(!isShared)}
                        className="w-5 h-5 accent-amber-500 rounded"
                      />
                    </label>
                    {isShared && (
                      <div className="mt-3 p-4 bg-[#111827] border border-amber-500/30 rounded-xl space-y-4 animate-fade-in shadow-inner">
                        <div>
                          <label className="text-[10px] text-gray-400 uppercase font-bold block mb-1">
                            Destino
                          </label>
                          <select
                            value={selectedJarId}
                            onChange={(e) => setSelectedJarId(e.target.value)}
                            className="w-full bg-[#374151] border border-gray-700 rounded-lg p-2.5 text-white text-sm outline-none"
                            required={isShared}
                          >
                            <option value="">-- Seleccionar Frasco --</option>
                            {jars.map((j) => (
                              <option key={j.id} value={j.id}>
                                {j.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-400 uppercase font-bold block mb-1">
                            Tu porcentaje de responsabilidad
                          </label>
                          <div className="flex items-center gap-3">
                            <input
                              type="range"
                              min="1"
                              max="100"
                              value={myPercentage}
                              onChange={(e) => setMyPercentage(e.target.value)}
                              className="flex-1 accent-amber-500 h-2 bg-gray-700 rounded-lg appearance-none"
                            />
                            <span className="font-mono font-bold text-amber-400 bg-[#1F2937] px-3 py-1.5 border border-amber-900/50 rounded-lg shadow">
                              {myPercentage}%
                            </span>
                          </div>
                        </div>
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
              {isIncome ? "Registrar Ingreso" : "Registrar Operación"}
            </button>
          </form>
        )}

        {/* ================= PERFIL Y CONFIGURACIÓN ================= */}
        {activeTab === "perfil" && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-[#1F2937] p-6 rounded-2xl border border-gray-800 shadow-lg flex flex-col items-center text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-cyan-900/40 to-transparent"></div>
              <img
                src={user.photoURL}
                alt="Avatar"
                className="w-24 h-24 rounded-full border-4 border-[#1F2937] shadow-[0_0_20px_rgba(6,182,212,0.5)] z-10 relative"
              />
              <h3 className="font-black text-white text-2xl mt-4 z-10">
                {user.displayName}
              </h3>
              <p className="text-sm text-gray-400 z-10">{user.email}</p>
              <div className="bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold px-3 py-1 rounded-full mt-3 uppercase tracking-wider z-10">
                Cuenta Premium
              </div>
            </div>

            <div className="bg-[#1F2937] rounded-2xl border border-gray-800 shadow-lg overflow-hidden">
              <div className="p-4 border-b border-gray-700/50 flex items-center justify-between hover:bg-[#374151] cursor-pointer transition-colors">
                <div className="flex items-center gap-3">
                  <Globe size={18} className="text-gray-400" />
                  <span className="text-sm font-medium text-gray-300">
                    Idioma
                  </span>
                </div>
                <span className="text-xs text-gray-500 bg-[#111827] px-2 py-1 rounded">
                  Español
                </span>
              </div>
              <div className="p-4 flex items-center justify-between hover:bg-[#374151] cursor-pointer transition-colors">
                <div className="flex items-center gap-3">
                  <DollarSign size={18} className="text-gray-400" />
                  <span className="text-sm font-medium text-gray-300">
                    Moneda Base
                  </span>
                </div>
                <span className="text-xs text-gray-500 bg-[#111827] px-2 py-1 rounded">
                  ARS (Peso Arg.)
                </span>
              </div>
            </div>

            <button
              onClick={() => signOut(auth).then(() => setUser(null))}
              className="w-full bg-red-500/10 border border-red-500/30 text-red-500 font-bold py-4 rounded-xl mt-6 flex justify-center items-center gap-2 hover:bg-red-500/20 transition-all shadow-lg"
            >
              <LogOut size={20} /> Cerrar Sesión Segura
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
          className="flex flex-col items-center justify-center bg-cyan-500 text-slate-950 rounded-full w-14 h-14 -mt-5 shadow-[0_0_15px_rgba(6,182,212,0.4)] border-4 border-[#111827] hover:scale-105 transition-transform"
        >
          <PlusCircle size={26} />
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
          onClick={() => setActiveTab("perfil")}
          className={`flex flex-col items-center p-2 transition-colors ${
            activeTab === "perfil"
              ? "text-cyan-400"
              : "text-gray-500 hover:text-gray-400"
          }`}
        >
          <Settings size={22} />
          <span className="text-[9px] mt-1 font-bold">Perfil</span>
        </button>
      </div>
    </div>
  );
}
