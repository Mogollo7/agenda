import React, { useEffect, useRef } from 'react';
import { Animated, Modal, PanResponder, Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { c, fs, inner, r, sp } from './theme';
import { hap, useReduceMotion } from './motion';
import Mascot from './Mascot';

// Iconos Material (vector, sin emojis). Nombres propios → glifo de MaterialIcons.
const G = { list: 'format-list-bulleted', chart: 'bar-chart', gear: 'settings', plus: 'add', back: 'arrow-back', chev: 'expand-more', check: 'check',
  trash: 'delete-outline', edit: 'edit', search: 'search', x: 'close', sort: 'sort', info: 'info-outline', dots: 'more-vert' };
export const Icon = ({ n, s = 24, col = c.text }) => <MaterialIcons name={G[n]} size={s} color={col} accessible={false} />;

// Área táctil 48dp (M3 / WCAG 2.2) con ripple.
export const IconBtn = ({ n, label, onPress, col, s }) => (
  <Pressable onPress={() => { hap.tap(); onPress?.(); }} accessibilityRole="button" accessibilityLabel={label}
    android_ripple={{ color: c.line, borderless: true, radius: 24 }}
    style={({ pressed }) => ({ width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24, backgroundColor: pressed ? c.surfaceHigh : 'transparent' })}>
    <Icon n={n} col={col} s={s} />
  </Pressable>
);

// Botones M3: primary = filled, secondary = outlined, tonal, ghost = text, danger = filled error.
export const Btn = ({ title, onPress, kind = 'primary', disabled, icon, style, fsc = 1 }) => {
  const K = {
    primary: { bg: c.primary, fg: c.onPrimary }, tonal: { bg: c.secContainer, fg: c.onSecContainer },
    danger: { bg: c.errorContainer, fg: c.onErrorContainer }, secondary: { bg: 'transparent', fg: c.primary, bd: c.outline },
    ghost: { bg: 'transparent', fg: c.primary }, ghostDanger: { bg: 'transparent', fg: c.error },
  }[kind];
  return (
    <Pressable onPress={() => { hap.tap(); onPress?.(); }} disabled={disabled} accessibilityRole="button" accessibilityState={{ disabled }} accessibilityLabel={title}
      android_ripple={{ color: 'rgba(255,255,255,0.16)' }}
      style={({ pressed }) => [{
        minHeight: 48, paddingHorizontal: kind.startsWith('ghost') ? sp.md : sp.lg - 2, borderRadius: r.pill, flexDirection: 'row', gap: sp.xs + 2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
        backgroundColor: K.bg, borderWidth: K.bd ? 1 : 0, borderColor: K.bd, opacity: disabled ? 0.45 : 1, transform: [{ scale: pressed ? 0.97 : 1 }],
      }, style]}>
      {icon && <Icon n={icon} col={K.fg} s={18} />}
      <Text style={{ color: K.fg, fontSize: fs(0, fsc), fontWeight: '500', letterSpacing: 0.1 }}>{title}</Text>
    </Pressable>
  );
};

// FAB extendido M3 (radio lg 16), anclado abajo a la derecha sobre la barra.
export const Fab = ({ title, icon, onPress, bottom = 0, fsc = 1 }) => (
  <Pressable onPress={() => { hap.tap(); onPress(); }} accessibilityRole="button" accessibilityLabel={title} android_ripple={{ color: 'rgba(255,255,255,0.16)' }}
    style={({ pressed }) => ({ position: 'absolute', right: sp.md, bottom: sp.md + bottom, minHeight: 56, paddingHorizontal: sp.md + 4, borderRadius: r.lg, flexDirection: 'row', gap: sp.sm, alignItems: 'center',
      backgroundColor: c.primaryContainer, overflow: 'hidden', elevation: 6, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, transform: [{ scale: pressed ? 0.96 : 1 }] })}>
    <Icon n={icon} col={c.onPrimaryContainer} />
    <Text style={{ color: c.onPrimaryContainer, fontSize: fs(0, fsc), fontWeight: '500' }}>{title}</Text>
  </Pressable>
);

// Chip de asistencia (radio sm 8).
export const Tag = ({ t, kind = 'neutral', fsc }) => (
  <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: r.sm, backgroundColor: kind === 'accent' ? c.secContainer : 'transparent', borderWidth: kind === 'accent' ? 0 : 1, borderColor: kind === 'outline' ? c.primary : c.line }}>
    <Text style={{ color: kind === 'accent' ? c.onSecContainer : kind === 'outline' ? c.primary : c.mute, fontSize: fs(-1, fsc), fontWeight: '500' }}>{t}</Text>
  </View>
);

export const Field = ({ label, error, children, fsc }) => (
  <View style={{ gap: sp.xs }}>
    <Text style={{ color: error ? c.error : c.mute, fontSize: fs(-0.5, fsc) }}>{label}{error ? ' · obligatorio' : ''}</Text>
    {children}
    {!!error && <Text accessibilityLiveRegion="polite" style={{ color: c.error, fontSize: fs(-1, fsc) }}>{error}</Text>}
  </View>
);

// Campo de texto M3 delineado (radio sm 8).
export const Input = ({ error, fsc, style, ...p }) => (
  <TextInput placeholderTextColor={c.faint} cursorColor={c.primary} selectionColor={c.primaryContainer} {...p}
    style={[{ backgroundColor: c.surface, color: c.text, borderRadius: r.sm, padding: sp.md - 2, minHeight: 56, fontSize: fs(0, fsc), borderWidth: error ? 2 : 1, borderColor: error ? c.error : c.outline }, style]} />
);

export const Select = ({ value, placeholder, onPress, error, fsc }) => (
  <Pressable onPress={() => { hap.tap(); onPress(); }} accessibilityRole="button" accessibilityLabel={value || placeholder} android_ripple={{ color: c.line }}
    style={{ backgroundColor: c.surface, borderRadius: r.sm, paddingHorizontal: sp.md - 2, minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: error ? 2 : 1, borderColor: error ? c.error : c.outline, overflow: 'hidden' }}>
    <Text style={{ color: value ? c.text : c.faint, fontSize: fs(0, fsc) }}>{value || placeholder}</Text>
    <Icon n="chev" s={20} col={c.mute} />
  </Pressable>
);

// Chips de filtro M3 (con check al seleccionar).
export const Seg = ({ opts, value, onChange, flex, fsc }) => (
  <View style={{ flexDirection: 'row', gap: sp.sm, alignSelf: flex ? 'stretch' : 'flex-start' }}>
    {opts.map((o) => {
      const on = o === value;
      return (
        <Pressable key={o} onPress={() => { hap.tap(); onChange(o); }} accessibilityRole="button" accessibilityState={{ selected: on }} android_ripple={{ color: c.line }}
          style={{ flex: flex ? 1 : 0, minHeight: 48, paddingHorizontal: sp.md, borderRadius: r.sm, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', borderWidth: on ? 0 : 1, borderColor: c.outline, backgroundColor: on ? c.secContainer : 'transparent', overflow: 'hidden' }}>
          {on && <Icon n="check" s={16} col={c.onSecContainer} />}
          <Text style={{ color: on ? c.onSecContainer : c.mute, fontSize: fs(-0.5, fsc), fontWeight: '500' }}>{o}</Text>
        </Pressable>
      );
    })}
  </View>
);

export const NetPill = ({ online, fsc }) => (
  <View accessibilityLiveRegion="polite" accessibilityLabel={online ? 'Con conexión' : 'Sin conexión'}
    style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: r.pill, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line }}>
    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: online ? c.ok : c.warn }} />
    <Text style={{ color: c.text, fontSize: fs(-1, fsc) }}>{online ? 'Con conexión' : 'Sin conexión'}</Text>
  </View>
);

// Barra de navegación M3: indicador píldora 64x32 y etiqueta; respeta la barra del sistema.
export const NavBar = ({ tabs, tab, setTab, fsc, bottom = 0 }) => (
  <View accessibilityRole="tablist" style={{ flexDirection: 'row', backgroundColor: c.surfaceHigh, paddingTop: sp.sm, paddingBottom: Math.max(bottom, sp.sm) + 2 }}>
    {tabs.map(([k, label, icon]) => {
      const on = k === tab;
      return (
        <Pressable key={k} onPress={() => { if (!on) hap.tap(); setTab(k); }} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={label}
          style={{ flex: 1, minHeight: 56, alignItems: 'center', gap: 4 }}>
          <View style={{ width: 64, height: 32, borderRadius: 16, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: on ? c.secContainer : 'transparent' }}>
            <Icon n={icon} col={on ? c.onSecContainer : c.mute} />
          </View>
          <Text style={{ color: on ? c.text : c.mute, fontSize: fs(-1, fsc), fontWeight: on ? '600' : '400' }}>{label}</Text>
        </Pressable>
      );
    })}
  </View>
);

// Hoja inferior M3 (radio xl 28 arriba).
export const Sheet = ({ visible, onClose, title, children }) => {
  const { bottom } = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }} accessibilityLabel="Cerrar">
        <Pressable style={{ backgroundColor: c.surfaceHigh, borderTopLeftRadius: r.xl, borderTopRightRadius: r.xl, padding: sp.md, paddingBottom: sp.md + Math.max(bottom, 10) }}>
          <View style={{ width: 32, height: 4, borderRadius: 2, backgroundColor: c.outline, alignSelf: 'center', marginBottom: sp.sm }} />
          {!!title && <Text style={{ color: c.text, fontSize: fs(0.5), fontWeight: '500', padding: sp.sm }}>{title}</Text>}
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

// Fila de hoja: el resalte es concéntrico a la hoja (28 - 16 de separación = 12).
export const SheetRow = ({ label, onPress, on, danger, icon }) => (
  <Pressable onPress={() => { hap.tap(); onPress(); }} accessibilityRole="button" accessibilityLabel={label} android_ripple={{ color: c.line }}
    style={({ pressed }) => ({ minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: sp.md, paddingHorizontal: sp.md, borderRadius: inner(r.xl, sp.md), overflow: 'hidden', backgroundColor: pressed ? c.surfaceHighest : on ? c.secContainer : 'transparent' })}>
    {icon && <Icon n={icon} s={22} col={danger ? c.error : c.mute} />}
    <Text style={{ flex: 1, color: danger ? c.error : c.text, fontSize: fs(0) }}>{label}</Text>
    {on && <Icon n="check" s={20} col={c.onSecContainer} />}
  </Pressable>
);

// Diálogo M3 (radio xl 28, relleno 24, acciones de texto a la derecha).
export const Confirm = ({ visible, title, body, ok = 'Eliminar', onOk, onCancel }) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent navigationBarTranslucent>
    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: sp.lg }}>
      <View accessibilityViewIsModal style={{ backgroundColor: c.surfaceHigh, borderRadius: r.xl, padding: sp.lg - 2, gap: sp.md }}>
        <Text style={{ color: c.text, fontSize: fs(1), fontWeight: '400' }}>{title}</Text>
        <Text style={{ color: c.mute, fontSize: fs(0), lineHeight: 24 }}>{body}</Text>
        <View style={{ flexDirection: 'row', gap: sp.xs, justifyContent: 'flex-end' }}>
          <Btn title="Cancelar" kind="ghost" onPress={onCancel} />
          <Btn title={ok} kind="ghostDanger" onPress={() => { hap.warn(); onOk(); }} />
        </View>
      </View>
    </View>
  </Modal>
);

// Aviso en un bocadillo: Orbi aparece abajo a la izquierda y "dice" el mensaje (con acción opcional, p. ej. Deshacer).
export function OrbiToast({ msg, mood = 'idle', action, onAction, onDone, bottom = 0 }) {
  const o = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!msg) return;
    o.setValue(0);
    const a = Animated.sequence([Animated.spring(o, { toValue: 1, friction: 6, tension: 90, useNativeDriver: true }), Animated.delay(action ? 5200 : 3400), Animated.timing(o, { toValue: 0, duration: 220, useNativeDriver: true })]);
    a.start(({ finished }) => finished && onDone());
    return () => a.stop();
  }, [msg]);
  if (!msg) return null;
  return (
    <Animated.View accessibilityLiveRegion="polite" accessibilityLabel={msg} pointerEvents="box-none"
      style={{ position: 'absolute', left: sp.sm, right: sp.md, bottom, flexDirection: 'row', alignItems: 'flex-end', gap: 2, opacity: o,
        transform: [{ translateY: o.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }, { scale: o.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }] }}>
      <Mascot size={64} mood={mood} />
      <View style={{ flexShrink: 1, marginBottom: 18, backgroundColor: c.surfaceHighest, borderRadius: r.lg, borderBottomLeftRadius: r.xs, paddingHorizontal: sp.md, paddingVertical: sp.sm + 2, borderWidth: 1, borderColor: c.line }}>
        <Text style={{ color: c.text, fontSize: fs(-0.2), lineHeight: 22 }}>{msg}</Text>
        {!!action && (
          <Pressable onPress={() => { hap.tap(); onAction?.(); onDone(); }} accessibilityRole="button" accessibilityLabel={action} style={{ minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }}>
            <Text style={{ color: c.primary, fontSize: fs(-0.5), fontWeight: '600' }}>{action}</Text>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}

// Tarjeta M3 elevada tonal (radio md 12) que se desliza a la izquierda para eliminar.
export function SwipeRow({ children, onSwipe, label = 'Eliminar' }) {
  const x = useRef(new Animated.Value(0)).current;
  const reduce = useReduceMotion();
  const armed = useRef(false);
  const TH = 96;
  const back = () => Animated.spring(x, { toValue: 0, friction: 7, tension: 90, useNativeDriver: true }).start();
  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => g.dx < -10 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
    onPanResponderMove: (_, g) => {
      const dx = Math.min(0, g.dx);
      x.setValue(dx < -TH ? -TH - (-dx - TH) * 0.3 : dx); // resistencia pasado el umbral
      if (dx <= -TH && !armed.current) { armed.current = true; hap.warn(); } else if (dx > -TH) armed.current = false;
    },
    onPanResponderRelease: (_, g) => { armed.current = false; back(); if (g.dx <= -TH) onSwipe(); },
    onPanResponderTerminate: back,
  })).current;
  const op = x.interpolate({ inputRange: [-TH, -20, 0], outputRange: [1, 0.4, 0], extrapolate: 'clamp' });
  return (
    <View style={{ borderRadius: r.md, overflow: 'hidden' }}>
      <Animated.View accessible={false} style={{ position: 'absolute', inset: 0, backgroundColor: c.errorContainer, alignItems: 'flex-end', justifyContent: 'center', paddingRight: sp.lg, opacity: op }}>
        <Icon n="trash" col={c.onErrorContainer} />
      </Animated.View>
      <Animated.View {...pan.panHandlers} accessibilityActions={[{ name: 'delete', label }]} onAccessibilityAction={() => onSwipe()}
        style={{ transform: [{ translateX: reduce ? 0 : x }] }}>{children}</Animated.View>
    </View>
  );
}
