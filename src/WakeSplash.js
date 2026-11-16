import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Text, View } from 'react-native';
import Mascot from './Mascot';
import { c, fs, sp } from './theme';

// Pantalla de carga: Orbi duerme con "zZz", despierta, mira a los lados, al frente y sonríe con los ojos arqueados.
// Termina cuando la línea de tiempo acabó Y `ready` (datos cargados).
const Z = [{ s: 18, x: 0, d: 0 }, { s: 24, x: 14, d: 500 }, { s: 32, x: 30, d: 1000 }];

export default function WakeSplash({ ready, onDone }) {
  const [st, setSt] = useState({ mood: 'sleep', look: undefined, smile: false });
  const [end, setEnd] = useState(false);
  const zOp = useRef(new Animated.Value(1)).current;
  const zs = useRef(Z.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const loops = zs.map((v, i) => Animated.loop(Animated.sequence([Animated.delay(Z[i].d), Animated.timing(v, { toValue: 1, duration: 1800, easing: Easing.out(Easing.quad), useNativeDriver: true }), Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: true })])));
    loops.forEach((l) => l.start());
    const T = [
      [1900, () => { Animated.timing(zOp, { toValue: 0, duration: 250, useNativeDriver: true }).start(); setSt({ mood: 'idle', look: { x: 0, y: 0 }, smile: false }); }], // despierta, se va el sueño
      [2400, () => setSt((s) => ({ ...s, look: { x: -1, y: 0 } }))],   // mira a la izquierda
      [3000, () => setSt((s) => ({ ...s, look: { x: 1, y: 0 } }))],    // mira a la derecha
      [3600, () => setSt((s) => ({ ...s, look: { x: 0, y: 0 } }))],    // mira al frente
      [4100, () => setSt({ mood: 'happy', look: { x: 0, y: 0 }, smile: true })], // ojos arqueados = sonrisa
      [5000, () => setEnd(true)],
    ].map(([ms, f]) => setTimeout(f, ms));
    return () => { T.forEach(clearTimeout); loops.forEach((l) => l.stop()); };
  }, []);

  useEffect(() => { if (end && ready) onDone(); }, [end, ready]);

  return (
    <View accessibilityLabel="Cargando inspecciones" style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center', gap: sp.lg }}>
      <View style={{ width: 150, height: 150, alignItems: 'center', justifyContent: 'center' }}>
        <Mascot size={120} mood={st.mood} look={st.look} smile={st.smile} />
        <Animated.View pointerEvents="none" style={{ position: 'absolute', right: -6, top: -4, opacity: zOp }}>
          {Z.map((z, i) => (
            <Animated.Text key={i} style={{ position: 'absolute', left: z.x, top: 0, color: c.primary, fontSize: z.s, fontWeight: '700',
              opacity: zs[i].interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 1, 1, 0] }),
              transform: [{ translateY: zs[i].interpolate({ inputRange: [0, 1], outputRange: [20, -28] }) }, { translateX: zs[i].interpolate({ inputRange: [0, 1], outputRange: [0, 10] }) }] }}>Z</Animated.Text>
          ))}
        </Animated.View>
      </View>
      <Text style={{ color: c.mute, fontSize: fs(0) }}>{st.smile ? 'Todo listo' : 'Cargando inspecciones'}</Text>
    </View>
  );
}
