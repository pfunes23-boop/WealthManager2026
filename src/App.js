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
  const [currentDate, setCurrentDate] = useState(new Date(2026, 5));
  const [transactions, setTransactions] = useState([]);
  const [wishes, setWishes] = useState([]);

  // NUEVOS ESTADOS FASE 1
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
      category: isIncome ? "💰 Ingreso" : selectedCategory,
      entity: isIncome ? "Billetera/Banco" : finalEntity,
      installments: finalInstallments,
      isPaid: isIncome ? true : false, // Los ingresos entran como cobrados por defecto
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

  // CÁLCULOS DE LA BILLETERA
  const totalIngresos = transactions
    .filter((t) => t.isIncome)
    .reduce((acc, curr) => acc + curr.amount, 0);
  const gastosPagados = transactions
    .filter((t) => !t.isIncome && t.isPaid)
    .reduce((acc, curr) => acc + curr.amount / curr.installments, 0);
  const saldoActual = totalIngresos - gastosPagados;
  const totalPendienteMes = transactions
    .filter((t) => !t.isIncome && !t.isPaid)
    .reduce((acc, curr) => acc + curr.amount / curr.installments, 0);

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
            Resumen
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
              </div>
              <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 shadow-xl">
                <h3 className="text-slate-400 text-xs mb-1 uppercase tracking-wide">
                  Pendiente de Pago
                </h3>
                <p className="text-2xl font-black text-rose-400">
                  ${totalPendienteMes.toLocaleString("es-AR")}
                </p>
              </div>
            </div>

            <h3 className="text-lg font-bold mt-6 mb-3 text-lime-400">
              Movimientos del mes
            </h3>
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className={`bg-slate-900 p-4 rounded-xl border ${
                  tx.isPaid
                    ? "border-emerald-900/50 opacity-70"
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
                        <CheckCircle2 className="text-emerald-500" size={24} />
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
                    <p className="text-xs text-slate-400">
                      <span className="mr-2">{tx.category}</span>
                      {tx.entity}{" "}
                      {tx.installments > 1 && `• Cuota de ${tx.installments}`}
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
            ))}
          </div>
        )}

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
                Concepto
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
            </div>

            {!isIncome && (
              <>
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

        {/* Mantenemos las pestañas de Deseos y Perfil iguales a tu versión anterior */}
        {activeTab === "deseos" && (
          <div className="p-4 text-center text-slate-400">
            Sección Deseos (Sin cambios)
          </div>
        )}
        {activeTab === "perfil" && (
          <div className="p-4 text-center text-slate-400">
            Sección Perfil (Sin cambios)
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 flex justify-around p-3 pb-safe z-50">
        <button
          onClick={() => setActiveTab("resumen")}
          className={`flex flex-col items-center p-2 ${
            activeTab === "resumen" ? "text-lime-400" : "text-slate-500"
          }`}
        >
          <Wallet size={24} />
          <span className="text-[10px] mt-1 font-bold">RESUMEN</span>
        </button>
        <button
          onClick={() => setActiveTab("agregar")}
          className="flex flex-col items-center justify-center bg-lime-500 text-slate-950 rounded-full w-14 h-14 -mt-6 shadow-[0_0_15px_rgba(132,204,22,0.3)] border-4 border-slate-950"
        >
          <PlusCircle size={28} />
        </button>
        <button
          onClick={() => setActiveTab("deseos")}
          className={`flex flex-col items-center p-2 ${
            activeTab === "deseos" ? "text-lime-400" : "text-slate-500"
          }`}
        >
          <ListTodo size={24} />
          <span className="text-[10px] mt-1 font-bold">DESEOS</span>
        </button>
        <button
          onClick={() => setActiveTab("perfil")}
          className={`flex flex-col items-center p-2 ${
            activeTab === "perfil" ? "text-lime-400" : "text-slate-500"
          }`}
        >
          <Settings size={24} />
          <span className="text-[10px] mt-1 font-bold">PERFIL</span>
        </button>
      </div>
    </div>
  );
}
