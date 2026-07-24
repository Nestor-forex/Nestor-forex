import { useEffect, useState } from 'react'
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from './firebase'

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
  const cerrar = (id, pl) => updateDoc(doc(db, 'users', uid, 'trades', id), { estado: 'cerrada', pl })

  return { trades, cargando, guardar, borrar, cerrar }
}
