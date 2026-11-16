import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

const K = { items: 'inspect.items.v1', prefs: 'inspect.prefs.v1' };
export const ESPACIOS = ['Aula', 'Laboratorio', 'Sala', 'Zona común'];
export const TIPOS = ['Eléctrica', 'Estructural', 'Limpieza', 'Equipamiento', 'Seguridad', 'Otra'];
export const PRIORIDADES = ['Baja', 'Media', 'Alta'];

// Servicio de almacenamiento: save / load / remove (el único que toca Preferences/AsyncStorage).
export const storage = {
  load: async () => JSON.parse((await AsyncStorage.getItem(K.items)) || '[]'),
  save: (list) => AsyncStorage.setItem(K.items, JSON.stringify(list)),
  remove: async (id) => storage.save((await storage.load()).filter((i) => i.id !== id)),
  prefs: async () => JSON.parse((await AsyncStorage.getItem(K.prefs)) || '{}'),
  savePrefs: (p) => AsyncStorage.setItem(K.prefs, JSON.stringify(p)),
};

export function validar(f) {
  const e = {};
  if (!f.espacio) e.espacio = 'Elige el espacio revisado.';
  if (!f.tipo) e.tipo = 'Indica qué tipo de novedad es.';
  if ((f.descripcion || '').trim().length < 10) e.descripcion = 'Describe la novedad con al menos 10 caracteres.';
  return e;
}

export function useOnline() {
  const [online, setOnline] = useState(true);
  const [known, setKnown] = useState(false); // false hasta el primer estado real: evita avisar "sin conexión" al arrancar
  useEffect(() => NetInfo.addEventListener((s) => { setOnline(s.isConnected !== false && s.isInternetReachable !== false); setKnown(true); }), []);
  return { online, known };
}

// Estado: 'loading' | 'ok' | 'error'
export function useInspecciones(onFail) {
  const [items, setItemsState] = useState([]);
  const ref = useRef([]); // siempre la lista vigente (los callbacks de avisos viven más que un render)
  const setItems = (l) => { ref.current = l; setItemsState(l); };
  const [status, setStatus] = useState('loading');
  const load = useCallback(async () => {
    setStatus('loading');
    try { const l = await storage.load(); ref.current = l; setItemsState(l); setStatus('ok'); } catch { setStatus('error'); }
  }, []);
  useEffect(() => { load(); }, [load]);

  // Primero se persiste, luego se actualiza la memoria: la lista nunca muestra algo que no quedó guardado.
  const commit = async (next) => {
    try { await storage.save(next); setItems(next); } catch (e) { onFail?.(); throw e; }
  };
  return {
    items, status, reload: load,
    add: (f) => commit([{ id: String(Date.now()), creada: Date.now(), resuelta: false, ...f }, ...ref.current]),
    update: (id, patch) => commit(ref.current.map((i) => (i.id === id ? { ...i, ...patch } : i))),
    restore: (x) => x && !ref.current.some((i) => i.id === x.id) && commit([...ref.current, x].sort((a, b) => b.creada - a.creada)),
    remove: (id) => commit(ref.current.filter((i) => i.id !== id)),
    removeResolved: () => commit(ref.current.filter((i) => !i.resuelta)),
    clear: () => commit([]),
  };
}

export function fechaCorta(ts) {
  const d = new Date(ts), n = new Date();
  const hm = d.toTimeString().slice(0, 5);
  const dias = Math.floor((new Date(n.toDateString()) - new Date(d.toDateString())) / 864e5);
  if (dias === 0) return `Hoy ${hm}`;
  if (dias === 1) return `Ayer ${hm}`;
  return `${d.getDate()}/${d.getMonth() + 1} ${hm}`;
}
