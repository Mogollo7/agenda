import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, FlatList, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Mascot, { PeekMascot } from './src/Mascot';
import WakeSplash from './src/WakeSplash';
import * as Clipboard from 'expo-clipboard';
import { c, fs, inner, r, sp } from './src/theme';
import { Btn, Confirm, Fab, Field, Icon, IconBtn, Input, NavBar, NetPill, Seg, Select, Sheet, SheetRow, SwipeRow, Tag, OrbiToast } from './src/ui';
import { hap } from './src/motion';
import { ESPACIOS, PRIORIDADES, TIPOS, fechaCorta, storage, useInspecciones, useOnline, validar } from './src/store';

const TABS = [['lista', 'Inspecciones', 'list'], ['resumen', 'Resumen', 'chart'], ['ajustes', 'Ajustes', 'gear']];
const ESCALAS = { Pequeño: 0.9, Normal: 1, Grande: 1.15 };

export default function App() {
  return <SafeAreaProvider><Main /></SafeAreaProvider>;
}

function Main() {
  const ins = useSafeAreaInsets();
  const { online, known } = useOnline();
  const [toast, setToast] = useState({ m: '' });
  const db = useInspecciones(() => { hap.err(); setToast({ m: 'No se pudo guardar. Intenta de nuevo.', mood: 'oops' }); });
  const [prefs, setPrefs] = useState({ escala: 'Normal', visto: true });
  const [tab, setTab] = useState('lista');
  const [stack, setStack] = useState(null); // {t:'detalle'|'form', id?}
  const [prefsOk, setPrefsOk] = useState(false);
  const [splashDone, setSplashDone] = useState(false);
  const fsc = ESCALAS[prefs.escala] || 1;

  useEffect(() => {
    storage.prefs().then((p) => setPrefs((x) => ({ ...x, visto: false, ...p }))).finally(() => setPrefsOk(true));
  }, []);
  const savePrefs = (p) => { const n = { ...prefs, ...p }; setPrefs(n); storage.savePrefs(n); };

  // Aviso automático al cambiar la conexión (5.3), no al arrancar.
  const prev = useRef(null);
  useEffect(() => {
    if (!known) return;
    const was = prev.current; prev.current = online;
    if (was === null || was === online) return;
    setToast({ m: online ? 'Conexión restablecida' : 'Sin conexión. Puedes seguir registrando.', mood: online ? 'happy' : 'offline' });
  }, [online]);

  useEffect(() => {
    const h = BackHandler.addEventListener('hardwareBackPress', () => { if (stack) { setStack(null); return true; } return false; });
    return () => h.remove();
  }, [stack]);

  const say = (m, undo, mood = 'idle') => setToast({ m, undo, mood });
  const mood = db.status === 'error' ? 'sad' : !online ? 'offline' : 'idle';

  if (!splashDone || !prefsOk || db.status === 'loading') return <WakeSplash ready={prefsOk && db.status !== 'loading'} onDone={() => setSplashDone(true)} />;
  if (!prefs.visto) return <Onboarding online={online} fsc={fsc} onDone={() => savePrefs({ visto: true })} />;

  const item = stack?.id ? db.items.find((i) => i.id === stack.id) : null;
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: c.bg }}>
      <StatusBar style="light" />
      <View style={{ flex: 1, maxWidth: 520, width: '100%', alignSelf: 'center' }}>
        {stack?.t === 'form' ? (
          <Form online={online} bottom={ins.bottom} fsc={fsc} inicial={item} onCancel={() => setStack(null)}
            onSave={async (f) => {
              item ? await db.update(item.id, f) : await db.add(f);
              setStack(null); setTab('lista'); hap.ok();
              say(online ? 'Inspección guardada' : 'Guardada en este dispositivo.', undefined, 'cheer');
            }} />
        ) : stack?.t === 'detalle' && item ? (
          <Detalle bottom={ins.bottom} fsc={fsc} item={item} onBack={() => setStack(null)} online={online}
            onEdit={() => setStack({ t: 'form', id: item.id })}
            onToggle={async () => { await db.update(item.id, { resuelta: !item.resuelta }); say(item.resuelta ? 'Marcada como pendiente' : 'Marcada como resuelta', undefined, item.resuelta ? 'idle' : 'cheer'); }}
            onDelete={async () => { const x = item; await db.remove(x.id); setStack(null); hap.ok(); say('Inspección eliminada', () => db.restore(x), 'sad'); }} />
        ) : (
          <>
            <View style={{ flex: 1 }}>
              {tab === 'lista' && <Lista hidePeek={!!toast.m} fsc={fsc} db={db} online={online} mood={mood} say={say}
                onOpen={(i) => setStack({ t: 'detalle', id: i.id })} onEdit={(i) => setStack({ t: 'form', id: i.id })}
                onNew={() => setStack({ t: 'form' })} />}
              {tab === 'resumen' && <Resumen fsc={fsc} items={db.items} online={online} mood={mood} />}
              {tab === 'ajustes' && <Ajustes fsc={fsc} prefs={prefs} savePrefs={savePrefs} online={online} db={db} say={say} />}
            </View>
            <NavBar tabs={TABS} tab={tab} setTab={setTab} fsc={fsc} bottom={ins.bottom} />
          </>
        )}
      </View>
      <OrbiToast msg={toast.m} mood={toast.mood} action={toast.undo && 'Deshacer'} onAction={toast.undo} bottom={stack?.t === 'detalle' ? 140 + ins.bottom : stack ? 12 + ins.bottom : 84 + ins.bottom} onDone={() => setToast({ m: '' })} />
    </SafeAreaView>
  );
}

/* ---------- Onboarding ---------- */
const PASOS = [
  ['Hola, soy Orbi', 'Te ayudo a registrar novedades de aulas, laboratorios y zonas comunes.', 'wave'],
  ['Funciona sin conexión', 'Todo se guarda en este dispositivo. No se pierde al cerrar la app.', 'sleep'],
  ['Listo para empezar', 'Registra, revisa y elimina inspecciones en segundos.', 'cheer'],
];
function Onboarding({ onDone, fsc, online }) {
  const [i, setI] = useState(0);
  const [t, b, m] = PASOS[i];
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg, padding: sp.lg }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><NetPill online={online} fsc={fsc} /><Btn kind="ghost" title="Omitir" onPress={onDone} /></View>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: sp.lg }}>
        <Mascot size={fs(3)} mood={m} />
        <Text style={{ color: c.text, fontSize: fs(1.5, fsc), fontWeight: '500', textAlign: 'center' }}>{t}</Text>
        <Text style={{ color: c.mute, fontSize: fs(0, fsc), lineHeight: 26, textAlign: 'center' }}>{b}</Text>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: sp.md }}>
        {PASOS.map((_, k) => <View key={k} style={{ width: k === i ? 22 : 7, height: 7, borderRadius: 4, backgroundColor: k === i ? c.a : c.n700 }} />)}
      </View>
      <Btn title={i === PASOS.length - 1 ? 'Comenzar' : 'Siguiente'} onPress={() => (i === PASOS.length - 1 ? onDone() : setI(i + 1))} />
    </SafeAreaView>
  );
}

/* ---------- 1.2 Lista ---------- */
const FILTROS = ['Todas', 'Alta', 'Pendientes'];
function Lista({ hidePeek, db, online, mood, onOpen, onEdit, onNew, say, fsc }) {
  const [filtro, setFiltro] = useState('Todas');
  const [q, setQ] = useState('');
  const [buscar, setBuscar] = useState(false);
  const [orden, setOrden] = useState('Recientes');
  const [menu, setMenu] = useState(false);
  const [fila, setFila] = useState(null);
  const [delId, setDelId] = useState(null);
  const [delRes, setDelRes] = useState(false);

  const vista = useMemo(() => {
    let l = db.items.filter((i) => (filtro === 'Alta' ? i.prioridad === 'Alta' : filtro === 'Pendientes' ? !i.resuelta : true));
    if (q.trim()) l = l.filter((i) => `${i.espacio} ${i.tipo} ${i.descripcion}`.toLowerCase().includes(q.trim().toLowerCase()));
    const peso = { Alta: 3, Media: 2, Baja: 1 };
    return [...l].sort((a, b) => (orden === 'Prioridad' ? peso[b.prioridad] - peso[a.prioridad] : b.creada - a.creada));
  }, [db.items, filtro, q, orden]);

  const Head = (
    <View style={{ gap: sp.md, paddingBottom: sp.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: c.text, fontSize: fs(1.2, fsc), fontWeight: '500', letterSpacing: -0.4 }} numberOfLines={1}>Inspecciones</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: sp.sm, marginTop: 4, flexWrap: 'wrap' }}>
            <NetPill online={online} fsc={fsc} />
            <Text style={{ color: c.mute, fontSize: fs(-0.5, fsc) }}>{db.items.length} guardados</Text>
          </View>
        </View>
        <IconBtn n="search" label="Buscar" onPress={() => { setBuscar(!buscar); setQ(''); }} />
        <IconBtn n="dots" label="Más opciones" onPress={() => setMenu(true)} />
      </View>
      {buscar && <Input autoFocus value={q} onChangeText={setQ} placeholder="Buscar por espacio, tipo o texto" fsc={fsc} accessibilityLabel="Buscar" />}
      {!online && (
        <View style={{ padding: sp.sm + 2, borderRadius: r.md, backgroundColor: 'rgba(35,37,50,0.6)', borderWidth: 1, borderColor: c.line }}>
          <Text style={{ color: c.mute, fontSize: fs(-0.5, fsc), lineHeight: 20 }}>Puedes seguir registrando. Se guardan en este dispositivo.</Text>
        </View>
      )}
      <Seg opts={FILTROS} value={filtro} onChange={setFiltro} fsc={fsc} />
    </View>
  );

  let cuerpo;
  if (db.status === 'error') cuerpo = (
    <View style={{ gap: sp.sm, padding: sp.md, borderRadius: r.lg, backgroundColor: c.surface, borderWidth: 1, borderColor: c.a, marginTop: sp.lg, alignItems: 'flex-start' }}>
      <Mascot size={fs(1.5)} mood="sad" />
      <Text style={{ color: c.text, fontSize: fs(0.5, fsc), fontWeight: '500' }}>No pudimos leer tus registros</Text>
      <Text style={{ color: c.mute, fontSize: fs(0, fsc), lineHeight: 24 }}>El almacenamiento del dispositivo no respondió. Tus datos anteriores siguen ahí.</Text>
      <Btn title="Reintentar" kind="secondary" onPress={db.reload} />
    </View>
  );
  else if (!db.items.length) cuerpo = (
    <View style={{ alignItems: 'center', gap: sp.lg, paddingTop: sp.xl, paddingHorizontal: sp.md }}>
      <Mascot size={fs(2.5)} mood={mood} />
      <Text style={{ color: c.text, fontSize: fs(1, fsc), fontWeight: '500' }}>Aún no hay inspecciones</Text>
      <Text style={{ color: c.mute, fontSize: fs(0, fsc), lineHeight: 24, textAlign: 'center' }}>Registra la primera. Funciona sin conexión y no se pierde al cerrar la app.</Text>
      <Btn title="Nueva inspección" icon="plus" onPress={onNew} />
    </View>
  );
  else if (!vista.length) cuerpo = (
    <View style={{ alignItems: 'center', gap: sp.sm, paddingTop: sp.xl }}>
      <Text style={{ color: c.text, fontSize: fs(0.5, fsc), fontWeight: '500' }}>{q ? 'Sin resultados' : `Sin resultados para ${filtro}`}</Text>
      <Text style={{ color: c.mute, fontSize: fs(-0.5, fsc) }}>No hay registros con ese criterio.</Text>
      <Btn kind="ghost" title="Ver todas" onPress={() => { setFiltro('Todas'); setQ(''); setBuscar(false); }} />
    </View>
  );

  const fi = fila && db.items.find((i) => i.id === fila);
  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={db.status === 'ok' && vista.length ? vista : []}
        keyExtractor={(i) => i.id}
        ListHeaderComponent={Head}
        ListEmptyComponent={cuerpo}
        contentContainerStyle={{ padding: sp.md, paddingBottom: 120, gap: sp.sm }}
        renderItem={({ item: i }) => (
          <SwipeRow onSwipe={() => setDelId(i.id)}>
            <Pressable onPress={() => onOpen(i)} accessibilityRole="button" accessibilityLabel={`${i.espacio}, ${i.tipo}, prioridad ${i.prioridad}`} android_ripple={{ color: c.line }}
              style={({ pressed }) => ({ backgroundColor: pressed ? c.surfaceHigh : c.surface, borderRadius: r.md, padding: sp.md, gap: 6, opacity: i.resuelta ? 0.6 : 1 })}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ flex: 1, color: c.primary, fontSize: fs(-1, fsc), letterSpacing: 1, textTransform: 'uppercase' }}>{i.espacio} · {fechaCorta(i.creada)}</Text>
                <IconBtn n="dots" label="Opciones del registro" s={20} onPress={() => setFila(i.id)} />
              </View>
              <Text style={{ color: c.text, fontSize: fs(0.5, fsc), marginTop: -10 }} numberOfLines={2}>{i.descripcion}</Text>
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                <Tag t={i.tipo} fsc={fsc} />
                <Tag t={i.prioridad} kind={i.prioridad === 'Alta' ? 'outline' : i.prioridad === 'Media' ? 'accent' : 'neutral'} fsc={fsc} />
                {i.resuelta && <Tag t="Resuelta" kind="accent" fsc={fsc} />}
              </View>
            </Pressable>
          </SwipeRow>
        )}
      />
      {!!db.items.length && <Fab title="Nueva inspección" icon="plus" onPress={onNew} fsc={fsc} />}

      {!!db.items.length && !hidePeek && <PeekMascot style={{ bottom: 0 }} look={{ x: 1, y: -0.4 }} mood={online ? 'idle' : 'offline'} />}
      <Sheet visible={menu} onClose={() => setMenu(false)} title="Opciones">
        <SheetRow icon="sort" label={`Ordenar: ${orden === 'Recientes' ? 'por prioridad' : 'por recientes'}`} onPress={() => { setOrden(orden === 'Recientes' ? 'Prioridad' : 'Recientes'); setMenu(false); }} />
        <SheetRow icon="check" label="Eliminar resueltas" onPress={() => { setMenu(false); setDelRes(true); }} />
        <SheetRow icon="info" label="Recargar desde el dispositivo" onPress={() => { setMenu(false); db.reload(); }} />
      </Sheet>
      <Sheet visible={!!fi} onClose={() => setFila(null)} title={fi?.espacio}>
        <SheetRow icon="list" label="Ver detalle" onPress={() => { const x = fi; setFila(null); onOpen(x); }} />
        <SheetRow icon="edit" label="Editar" onPress={() => { const x = fi; setFila(null); onEdit(x); }} />
        <SheetRow icon="check" label={fi?.resuelta ? 'Marcar pendiente' : 'Marcar resuelta'} onPress={() => { const x = fi; setFila(null); db.update(x.id, { resuelta: !x.resuelta }); }} />
        <SheetRow icon="trash" danger label="Eliminar" onPress={() => { setDelId(fi.id); setFila(null); }} />
      </Sheet>
      <Confirm visible={delRes} title="Eliminar resueltas" body="Se borrarán de este dispositivo todas las inspecciones marcadas como resueltas. No se puede deshacer." ok="Eliminar"
        onCancel={() => setDelRes(false)} onOk={async () => { setDelRes(false); await db.removeResolved(); say('Resueltas eliminadas'); }} />
      <Confirm visible={!!delId} title="Eliminar inspección" body="Se borrará de este dispositivo, incluido el almacenamiento local. No se puede deshacer."
        onCancel={() => setDelId(null)} onOk={async () => { const x = db.items.find((i) => i.id === delId); await db.remove(delId); setDelId(null); hap.ok(); say('Inspección eliminada', () => db.restore(x), 'sad'); }} />
    </View>
  );
}

/* ---------- 2. Formulario (nuevo / editar) ---------- */
function Form({ online, bottom = 0, inicial, onSave, onCancel, fsc }) {
  const [f, setF] = useState({ espacio: '', tipo: '', descripcion: '', prioridad: 'Media', ...(inicial || {}) });
  const [sel, setSel] = useState(null);
  const [intento, setIntento] = useState(false);
  const [clip, setClip] = useState('');
  const [oops, setOops] = useState(false);
  // Orbi "ve" lo que copiaste: si hay texto en el portapapeles y la descripción está vacía, se asoma y ofrece pegarlo.
  useEffect(() => { Clipboard.getStringAsync().then((t) => setClip((t || '').trim())).catch(() => {}); }, []);
  const err = validar(f);
  const len = f.descripcion.length;
  const mira = clip && !len ? { x: 1, y: -0.8 } : { x: Math.max(-1, Math.min(1, (len % 28) / 14 - 1)), y: len ? 0.5 : -0.2 };
  const n = Object.keys(err).length;
  const ver = (k) => (intento ? err[k] : undefined);
  const guardar = () => { setIntento(true); if (n) { hap.err(); setOops(true); setTimeout(() => setOops(false), 1600); } if (!n) onSave({ espacio: f.espacio, tipo: f.tipo, descripcion: f.descripcion.trim(), prioridad: f.prioridad }); };
  const lista = sel === 'espacio' ? ESPACIOS : TIPOS;
  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: sp.sm, paddingTop: sp.xs }}>
        <Btn kind="ghost" title="Cancelar" onPress={onCancel} />
        <Text style={{ color: c.text, fontSize: fs(0, fsc), fontWeight: '500' }}>{inicial ? 'Editar inspección' : 'Nueva inspección'}</Text>
        <Btn kind="ghost" title="Guardar" onPress={guardar} />
      </View>
      <ScrollView contentContainerStyle={{ padding: sp.md + 2, gap: sp.md, paddingBottom: sp.xl + bottom }} keyboardShouldPersistTaps="handled">
        <View style={{ alignSelf: 'flex-start' }}><NetPill online={online} fsc={fsc} /></View>
        <Field label="Espacio" error={ver('espacio')} fsc={fsc}><Select value={f.espacio} placeholder="Selecciona un espacio" error={ver('espacio')} onPress={() => setSel('espacio')} fsc={fsc} /></Field>
        <Field label="Tipo de novedad" error={ver('tipo')} fsc={fsc}><Select value={f.tipo} placeholder="Selecciona un tipo" error={ver('tipo')} onPress={() => setSel('tipo')} fsc={fsc} /></Field>
        <Field label="Descripción breve" error={ver('descripcion')} fsc={fsc}>
          <Input multiline value={f.descripcion} onChangeText={(t) => setF({ ...f, descripcion: t })} placeholder="Qué encontraste" error={ver('descripcion')} fsc={fsc} style={{ minHeight: 96, textAlignVertical: 'top' }} accessibilityLabel="Descripción breve" />
        </Field>
        <Field label="Prioridad" fsc={fsc}><Seg flex opts={PRIORIDADES} value={f.prioridad} onChange={(p) => setF({ ...f, prioridad: p })} fsc={fsc} /></Field>
        {intento && n > 0 && (
          <View accessibilityLiveRegion="polite" style={{ padding: sp.sm + 2, borderRadius: r.md, backgroundColor: c.surface, borderWidth: 1, borderColor: c.a }}>
            <Text style={{ color: c.text, fontSize: fs(-0.5, fsc) }}>Completa los {n} campos marcados para guardar.</Text>
          </View>
        )}
        <Btn title={inicial ? 'Guardar cambios' : 'Guardar inspección'} onPress={guardar} />
      </ScrollView>
      <PeekMascot style={{ bottom }} look={mira} excited={(!!clip && !len) || oops} mood={oops ? 'oops' : !len ? 'idle' : n ? 'think' : 'happy'} />
      {!!clip && !len && (
        <Pressable onPress={() => { hap.ok(); setF({ ...f, descripcion: clip.slice(0, 300) }); }} accessibilityRole="button" accessibilityLabel="Pegar lo copiado en la descripción"
          style={{ position: 'absolute', left: 72, bottom: bottom + sp.lg + 24, maxWidth: 240, backgroundColor: c.secContainer, borderRadius: r.md, borderBottomLeftRadius: r.xs, padding: sp.sm + 2 }}>
          <Text style={{ color: c.onSecContainer, fontSize: fs(-1, fsc), fontWeight: '600' }}>Pegar lo que copiaste</Text>
          <Text numberOfLines={1} style={{ color: c.mute, fontSize: fs(-1, fsc) }}>{clip}</Text>
        </Pressable>
      )}
      <Sheet visible={!!sel} onClose={() => setSel(null)} title={sel === 'espacio' ? 'Espacio' : 'Tipo de novedad'}>
        {sel && lista.map((o) => <SheetRow key={o} label={o} on={f[sel] === o} onPress={() => { setF({ ...f, [sel]: o }); setSel(null); }} />)}
      </Sheet>
    </KeyboardAvoidingView>
  );
}

/* ---------- 3. Detalle ---------- */
function Detalle({ bottom = 0, item, onBack, onEdit, onToggle, onDelete, online, fsc }) {
  const [menu, setMenu] = useState(false);
  const [del, setDel] = useState(false);
  const fila = (k, v, hi) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: sp.md - 2, borderBottomWidth: 1, borderBottomColor: c.line }}>
      <Text style={{ color: c.mute, fontSize: fs(-0.2, fsc) }}>{k}</Text>
      <Text style={{ color: hi ? c.a400 : c.text, fontSize: fs(-0.2, fsc) }}>{v}</Text>
    </View>
  );
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: sp.xs }}>
        <IconBtn n="back" label="Volver a inspecciones" onPress={onBack} col={c.a400} />
        <Text style={{ flex: 1, color: c.a400, fontSize: fs(0, fsc) }}>Inspecciones</Text>
        <NetPill online={online} fsc={fsc} />
        <IconBtn n="dots" label="Más opciones" onPress={() => setMenu(true)} />
      </View>
      <ScrollView contentContainerStyle={{ padding: sp.md + 2, gap: sp.lg - 6, paddingBottom: 190 }}>
        <View style={{ gap: 6 }}>
          <Text style={{ color: c.a, fontSize: fs(-1, fsc), letterSpacing: 1.4, textTransform: 'uppercase' }}>{item.espacio}</Text>
          <Text style={{ color: c.text, fontSize: fs(1, fsc), fontWeight: '500', lineHeight: fs(1.3, fsc) }}>{item.descripcion.split('\n')[0].slice(0, 80)}</Text>
        </View>
        <View style={{ backgroundColor: c.surface, borderRadius: r.md, overflow: 'hidden' }}>
          {fila('Espacio', item.espacio)}{fila('Tipo', item.tipo)}{fila('Prioridad', item.prioridad, true)}
          {fila('Estado', item.resuelta ? 'Resuelta' : 'Pendiente')}{fila('Registrada', fechaCorta(item.creada))}
        </View>
        <View style={{ gap: 6 }}>
          <Text style={{ color: c.mute, fontSize: fs(-0.5, fsc) }}>Descripción</Text>
          <Text style={{ color: c.text, fontSize: fs(0.2, fsc), lineHeight: 26 }}>{item.descripcion}</Text>
        </View>
      </ScrollView>
      <View style={{ position: 'absolute', left: sp.md, right: sp.md, bottom: sp.md + bottom, gap: sp.sm }}>
        <Btn title={item.resuelta ? 'Marcar pendiente' : 'Marcar resuelta'} kind="tonal" onPress={onToggle} />
        <Btn title="Eliminar inspección" icon="trash" kind="danger" onPress={() => setDel(true)} />
      </View>
      <Sheet visible={menu} onClose={() => setMenu(false)} title="Opciones">
        <SheetRow icon="edit" label="Editar" onPress={() => { setMenu(false); onEdit(); }} />
        <SheetRow icon="check" label={item.resuelta ? 'Marcar pendiente' : 'Marcar resuelta'} onPress={() => { setMenu(false); onToggle(); }} />
        <SheetRow icon="trash" danger label="Eliminar" onPress={() => { setMenu(false); setDel(true); }} />
      </Sheet>
      <Confirm visible={del} title="Eliminar inspección" body="Se borrará de este dispositivo, incluido el almacenamiento local. No se puede deshacer."
        onCancel={() => setDel(false)} onOk={onDelete} />
    </View>
  );
}

/* ---------- Resumen ---------- */
function Resumen({ items, online, mood, fsc }) {
  const cuenta = (k, vals) => vals.map((v) => [v, items.filter((i) => i[k] === v).length]);
  const pend = items.filter((i) => !i.resuelta).length;
  const barras = (titulo, datos) => {
    const max = Math.max(1, ...datos.map((d) => d[1]));
    return (
      <View style={{ backgroundColor: c.surface, borderRadius: r.lg, padding: sp.md, gap: sp.sm }}>
        <Text style={{ color: c.text, fontSize: fs(0.3, fsc), fontWeight: '500' }}>{titulo}</Text>
        {datos.map(([k, v]) => (
          <View key={k} style={{ gap: 4 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: c.mute, fontSize: fs(-0.5, fsc) }}>{k}</Text><Text style={{ color: c.text, fontSize: fs(-0.5, fsc) }}>{v}</Text>
            </View>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: c.line }}><View style={{ width: `${(v / max) * 100}%`, height: 6, borderRadius: 3, backgroundColor: c.a }} /></View>
          </View>
        ))}
      </View>
    );
  };
  return (
    <ScrollView contentContainerStyle={{ padding: sp.md + 2, gap: sp.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ color: c.text, fontSize: fs(1.5, fsc), fontWeight: '500', letterSpacing: -0.4 }}>Resumen</Text>
        <NetPill online={online} fsc={fsc} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: sp.md, backgroundColor: c.surface, borderRadius: r.lg, padding: sp.md }}>
        <Mascot size={fs(2)} mood={items.length && !pend ? 'cheer' : mood} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: c.text, fontSize: fs(1, fsc), fontWeight: '500' }}>{pend} pendientes</Text>
          <Text style={{ color: c.mute, fontSize: fs(-0.5, fsc) }}>{items.length ? `de ${items.length} registradas` : 'Aún sin registros'}</Text>
        </View>
      </View>
      {barras('Por prioridad', cuenta('prioridad', PRIORIDADES))}
      {barras('Por tipo', cuenta('tipo', TIPOS))}
      {barras('Por espacio', cuenta('espacio', ESPACIOS))}
    </ScrollView>
  );
}

/* ---------- Ajustes ---------- */
function Ajustes({ prefs, savePrefs, online, db, say, fsc }) {
  const [borrar, setBorrar] = useState(false);
  const [acerca, setAcerca] = useState(false);
  const Sec = ({ t, children }) => (
    <View style={{ gap: sp.sm }}>
      <Text style={{ color: c.a, fontSize: fs(-1, fsc), letterSpacing: 1.4, textTransform: 'uppercase' }}>{t}</Text>
      <View style={{ backgroundColor: c.surface, borderRadius: r.lg, padding: sp.md, gap: sp.sm }}>{children}</View>
    </View>
  );
  return (
    <ScrollView contentContainerStyle={{ padding: sp.md + 2, gap: sp.lg - 6 }}>
      <Text style={{ color: c.text, fontSize: fs(1.5, fsc), fontWeight: '500', letterSpacing: -0.4 }}>Ajustes</Text>
      <Sec t="Tamaño de texto">
        <Seg flex opts={Object.keys(ESCALAS)} value={prefs.escala} onChange={(e) => savePrefs({ escala: e })} fsc={fsc} />
        <Text style={{ color: c.mute, fontSize: fs(-0.5, fsc) }}>Escala áurea (φ): 11 · 16 · 26 · 42 px.</Text>
      </Sec>
      <Sec t="Conexión">
        <NetPill online={online} fsc={fsc} />
        <Text style={{ color: c.mute, fontSize: fs(-0.5, fsc), lineHeight: 20 }}>Sin conexión la app sigue funcionando: todo se guarda en este dispositivo.</Text>
      </Sec>
      <Sec t="Datos">
        <Text style={{ color: c.mute, fontSize: fs(-0.5, fsc) }}>{db.items.length} registros en este dispositivo.</Text>
        <Btn title="Borrar todos los datos" icon="trash" kind="secondary" onPress={() => setBorrar(true)} />
      </Sec>
      <Sec t="Aplicación">
        <Btn title="Ver tutorial" kind="secondary" onPress={() => savePrefs({ visto: false })} />
        <Btn title="Acerca de InspectApp" icon="info" kind="ghost" onPress={() => setAcerca(true)} />
      </Sec>
      <Confirm visible={borrar} title="Borrar todo" body="Se eliminarán todas las inspecciones de este dispositivo. No se puede deshacer." ok="Borrar"
        onCancel={() => setBorrar(false)} onOk={async () => { await db.clear(); setBorrar(false); say('Datos borrados'); }} />
      <Sheet visible={acerca} onClose={() => setAcerca(false)} title="InspectApp 1.0">
        <View style={{ alignItems: 'center', gap: sp.sm, padding: sp.md }}>
          <Mascot size={fs(2)} mood="happy" />
          <Text style={{ color: c.mute, fontSize: fs(-0.2, fsc), textAlign: 'center', lineHeight: 22 }}>Microapp de inspecciones. Funciona sin conexión y guarda todo localmente.</Text>
        </View>
      </Sheet>
    </ScrollView>
  );
}
