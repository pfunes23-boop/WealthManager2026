import React, { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
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
  LogIn,
  ChevronLeft,
  ChevronRight,
  ListTodo,
  Wallet,
  Users,
  Settings,
} from "lucide-react";

// TU CONFIGURACIÓN EXACTA DE FIREBASE
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
  const [expenses, setExpenses] = useState([]);
  const [wishes, setWishes] = useState([]);

  const [entities, setEntities] = useState([
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
  const [linkCode, setLinkCode] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) loadData(currentUser.uid);
    });
    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error al iniciar sesión:", error);
    }
  };

  const loadData = async (uid) => {
    const qExpenses = query(
      collection(db, `users/${uid}/expenses`),
      orderBy("date", "desc")
    );
    const snapshotExp = await getDocs(qExpenses);
    setExpenses(snapshotExp.docs.map((doc) => ({ id: doc.id, ...doc.data() })));

    const qWishes = query(collection(db, `users/${uid}/wishes`));
    const snapshotWish = await getDocs(qWishes);
    setWishes(snapshotWish.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!user) return;

    let finalEntity = selectedEntity;
    if (selectedEntity === "nueva" && newEntity.trim() !== "") {
      finalEntity = newEntity;
      setEntities([...entities, newEntity]);
    }

    const finalAmount = isShared
      ? parseFloat(amount) * (parseFloat(myPercentage) / 100)
      : parseFloat(amount);

    const newExpense = {
      description,
      amount: finalAmount,
      entity: finalEntity,
      installments: parseInt(installments),
      date: new Date().toISOString(),
      startMonth: currentDate.getMonth(),
      startYear: currentDate.getFullYear(),
    };

    const docRef = await addDoc(
      collection(db, `users/${user.uid}/expenses`),
      newExpense
    );
    setExpenses([{ id: docRef.id, ...newExpense }, ...expenses]);
    setAmount("");
    setDescription("");
    setNewEntity("");
  };

  const handleDeleteExpense = async (id) => {
    await deleteDoc(doc(db, `users/${user.uid}/expenses`, id));
    setExpenses(expenses.filter((e) => e.id !== id));
  };

  const handleAddWish = async (text) => {
    if (!user || !text.trim()) return;
    const newWish = { text, completed: false, date: new Date().toISOString() };
    const docRef = await addDoc(
      collection(db, `users/${user.uid}/wishes`),
      newWish
    );
    setWishes([{ id: docRef.id, ...newWish }, ...wishes]);
  };

  // PANTALLA DE LOGIN
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 font-sans">
        <div className="w-16 h-16 bg-lime-500 rounded-2xl flex items-center justify-center mb-8 shadow-[0_0_30px_rgba(132,204,22,0.3)]">
          <Wallet size={32} className="text-slate-950" />
        </div>
        <h1 className="text-3xl font-black text-white mb-2">Wealth Manager</h1>
        <p className="text-slate-400 mb-10 text-center">
          Gestión inteligente de finanzas y cuotas.
        </p>
        <button
          onClick={loginWithGoogle}
          className="w-full bg-white text-slate-900 font-bold py-4 rounded-xl flex items-center justify-center gap-3"
        >
          <img
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
            alt="Google"
            className="w-6 h-6"
          />
          Continuar con Google
        </button>
      </div>
    );
  }

  // APP PRINCIPAL
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
            <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 shadow-xl">
              <h3 className="text-slate-400 text-sm mb-1">
                Total a Pagar este mes
              </h3>
              <p className="text-4xl font-black text-white">
                $
                {expenses
                  .reduce(
                    (acc, curr) => acc + curr.amount / curr.installments,
                    0
                  )
                  .toLocaleString("es-AR")}
              </p>
            </div>
            <h3 className="text-lg font-bold mt-6 mb-3 text-lime-400">
              Deudas activas
            </h3>
            {expenses.map((exp) => (
              <div
                key={exp.id}
                className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex justify-between items-center"
              >
                <div>
                  <p className="font-bold text-slate-100">{exp.description}</p>
                  <p className="text-xs text-slate-400">
                    {exp.entity} • {exp.installments} cuotas
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <p className="font-bold text-rose-400">
                    -${(exp.amount / exp.installments).toLocaleString("es-AR")}
                  </p>
                  <button
                    onClick={() => handleDeleteExpense(exp.id)}
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
            onSubmit={handleAddExpense}
            className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-4"
          >
            <h3 className="text-xl font-bold text-lime-400 mb-4">
              Nuevo Movimiento
            </h3>
            <div className="flex bg-slate-800 rounded-lg p-1 mb-4">
              <button
                type="button"
                onClick={() => setIsShared(false)}
                className={`flex-1 py-2 rounded-md text-sm font-bold ${
                  !isShared ? "bg-lime-500 text-slate-950" : "text-slate-400"
                }`}
              >
                Personal
              </button>
              <button
                type="button"
                onClick={() => setIsShared(true)}
                className={`flex-1 py-2 rounded-md text-sm font-bold ${
                  isShared ? "bg-lime-500 text-slate-950" : "text-slate-400"
                }`}
              >
                Compartido
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
                  Monto Total ($)
                </label>
                <input
                  type="number"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-slate-800 border-none rounded-lg p-3 text-white mt-1"
                />
              </div>
              {isShared && (
                <div className="w-1/3">
                  <label className="text-xs text-slate-400 uppercase">
                    Tu %
                  </label>
                  <input
                    type="number"
                    required
                    value={myPercentage}
                    onChange={(e) => setMyPercentage(e.target.value)}
                    className="w-full bg-slate-800 border-none rounded-lg p-3 text-white mt-1"
                  />
                </div>
              )}
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-xs text-slate-400 uppercase">
                  Entidad
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
                    placeholder="Nombre"
                    className="w-full bg-slate-700 border-none rounded-lg p-2 text-white mt-2"
                  />
                )}
              </div>
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
            </div>
            <button
              type="submit"
              className="w-full bg-lime-500 text-slate-950 font-black py-4 rounded-xl mt-4 flex justify-center gap-2 hover:bg-lime-400"
            >
              <PlusCircle size={20} /> Guardar
            </button>
          </form>
        )}

        {activeTab === "deseos" && (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-lime-400 mb-4">
              Lista de Compras / Compartida
            </h3>
            <input
              type="text"
              placeholder="Agregar a la lista... (Enter para guardar)"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleAddWish(e.target.value);
                  e.target.value = "";
                }
              }}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-white"
            />
            <div className="space-y-2 mt-4">
              {wishes.map((wish) => (
                <div
                  key={wish.id}
                  className="bg-slate-900 p-3 rounded-lg border border-slate-800 flex justify-between items-center"
                >
                  <p className="text-slate-200">{wish.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "perfil" && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 bg-slate-900 p-4 rounded-xl border border-slate-800">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt="perfil"
                  className="w-12 h-12 rounded-full"
                />
              ) : (
                <div className="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center">
                  <Users size={20} />
                </div>
              )}
              <div>
                <p className="font-bold text-white">
                  {user.displayName || "Usuario"}
                </p>
                <p className="text-sm text-slate-400">{user.email}</p>
              </div>
            </div>

            <div className="bg-slate-900 p-6 rounded-xl border border-lime-900 border-dashed text-center">
              <h3 className="text-lime-400 font-bold mb-2">
                Tu código para vincular:
              </h3>
              <p className="bg-slate-950 text-slate-300 font-mono p-3 rounded-lg text-sm select-all">
                {user.uid}
              </p>
              <p className="text-xs text-slate-500 mt-2">
                Comparte este código con quien quieras sincronizar la lista de
                deseos o los gastos compartidos.
              </p>
            </div>

            <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
              <h3 className="text-white font-bold mb-2">
                Vincular con otra cuenta
              </h3>
              <input
                type="text"
                value={linkCode}
                onChange={(e) => setLinkCode(e.target.value)}
                placeholder="Pega el código aquí..."
                className="w-full bg-slate-800 border-none rounded-lg p-3 text-white mb-3 text-sm"
              />
              <button className="w-full bg-slate-700 text-white font-bold py-3 rounded-lg">
                Sincronizar Cuentas
              </button>
            </div>

            <button
              onClick={() => signOut(auth)}
              className="w-full bg-red-950/30 text-red-500 font-bold py-4 rounded-xl"
            >
              Cerrar Sesión
            </button>
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
