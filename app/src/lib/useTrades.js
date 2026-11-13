import { useEffect, useState } from 'react'
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from './firebase'
import { diaLocal } from './guardianRiesgo'

// Diario de operaciones del usuario logueado, sincronizado en vivo por Firestore.
export function useTrades(uid) {
  const [trades, setTrades] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    if (!uid) {
      setTrades([])
      setCargando(false)
      return
    }
    setCargando(true)
    const q = query(collection(db, 'users', uid, 'trades'), orderBy('creado', 'desc'))
    return onSnapshot(
      q,
      (snap) => {
        setTrades(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
        setCargando(false)
      },
      () => setCargando(false)
    )
  }, [uid])

  const guardar = (t) => addDoc(collection(db, 'users', uid, 'trades'), { ...t, creado: serverTimestamp() })
  const borrar = (id) => deleteDoc(doc(db, 'users', uid, 'trades', id))
  // El día y el momento del CIERRE, que es cuando el resultado cuenta: los lee
  // el guardián de riesgo del Diario. El día es el local del teléfono.
  const cerrar = (id, pl) =>
    updateDoc(doc(db, 'users', uid, 'trades', id), { estado: 'cerrada', pl, cerradaEl: diaLocal(), cerradaEnMs: Date.now() })

  return { trades, cargando, guardar, borrar, cerrar }
}
