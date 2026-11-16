import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, View } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Circle } from 'react-native-svg';
import { c } from './theme';
import { useReduceMotion } from './motion';

// Orbi: esfera tipo Grok + ojos/rebote tipo puntos de Google, con reacciones al estilo Duolingo. Todo con native driver.
// mood: idle | offline | sleep | sad | happy | cheer (celebra: saltos, giro, confeti) | oops (niega con la cabeza)
//       | think (mira arriba, burbuja "...") | wave (se mece y saluda). Tocarla cambia de reacción cada vez.
const T = (v, to, duration, easing = Easing.inOut(Easing.sin)) => Animated.timing(v, { toValue: to, duration, easing, useNativeDriver: true });
const loop = (...a) => Animated.loop(Animated.sequence(a));
const CONFETI = ['#cbc1ff', '#e0a46c', '#7fd6a0', '#ffb4ab', '#ffffff', '#9b8fe0', '#e0a46c', '#7fd6a0'];

export default function Mascot({ size = 84, mood = 'idle', look, smile, eyePos = [0.36, 0.64, 0.4] }) {
  const v = useRef({ breathe: new Animated.Value(0), float: new Animated.Value(0), blink: new Animated.Value(1), look: new Animated.Value(0),
    hop: new Animated.Value(0), lookY: new Animated.Value(0), squash: new Animated.Value(0), ring: new Animated.Value(0), tilt: new Animated.Value(0), wink: new Animated.Value(1),
    spin: new Animated.Value(0), shake: new Animated.Value(0), rock: new Animated.Value(0), tear: new Animated.Value(0), dots: new Animated.Value(0),
    conf: new Animated.Value(0), z: new Animated.Value(0) }).current;
  const taps = useRef(0);
  const reduce = useReduceMotion();
  const lk = look || (mood === 'think' ? { x: -0.7, y: -1 } : undefined);
  const smiling = smile || mood === 'cheer' || mood === 'wave';

  useEffect(() => {
    v.blink.setValue(1); v.wink.setValue(1); v.rock.setValue(0); v.shake.setValue(0); v.spin.setValue(0); // por si un ciclo anterior se detuvo a medias
    const slow = mood === 'sleep' || mood === 'offline';
    const run = [
      loop(T(v.breathe, 1, slow ? 4200 : 2600), T(v.breathe, 0, slow ? 4200 : 2600)),
      loop(T(v.float, 1, slow ? 3600 : 2200), T(v.float, 0, slow ? 3600 : 2200)),
      loop(Animated.delay(slow ? 1800 : 2600), T(v.blink, 0.08, 90), T(v.blink, 1, 130), Animated.delay(slow ? 0 : 1400), T(v.blink, 0.08, 90), T(v.blink, 1, 130)),
    ];
    if (!lk) run.push(loop(Animated.delay(1800), T(v.look, 1, 380), Animated.delay(1100), T(v.look, -1, 520), Animated.delay(900), T(v.look, 0, 380)));
    if (mood === 'happy') run.push(loop(T(v.ring, 1, 1500, Easing.out(Easing.quad)), T(v.ring, 0, 0)));
    if (mood === 'sad') {
      run.push(loop(Animated.delay(900), T(v.tear, 1, 900, Easing.in(Easing.quad)), T(v.tear, 0, 0)));
      T(v.tilt, 1, 600).start();
    } else if (mood === 'think') run.push(loop(T(v.tilt, 0.6, 1400), T(v.tilt, 0.2, 1400)));
    else v.tilt.setValue(0);
    if (mood === 'think') run.push(loop(T(v.dots, 1, 1200, Easing.linear), T(v.dots, 0, 0)));
    if (mood === 'wave') run.push(loop(T(v.rock, 1, 420), T(v.rock, -1, 420)));
    if (mood === 'sleep') run.push(loop(T(v.z, 1, 2200, Easing.out(Easing.quad)), T(v.z, 0, 0)));
    if (reduce) return;
    if (mood === 'happy') hopNow();
    if (mood === 'cheer') celebrate();
    if (mood === 'oops') Animated.sequence([T(v.shake, 1, 70), T(v.shake, -1, 110), T(v.shake, 1, 110), T(v.shake, -1, 110), T(v.shake, 0, 70)]).start();
    run.forEach((a) => a.start());
    // Se inquieta cada tanto (como la mascota de Duolingo): salto chico, guiño o meneo.
    const fid = mood === 'idle' ? setInterval(() => { [hopNow, winkNow, wiggle][Math.floor(Math.random() * 3)](); }, 6500) : null;
    return () => { run.forEach((a) => a.stop()); if (fid) clearInterval(fid); };
  }, [mood, reduce]);

  // Mirada dirigida (seguir el texto, el portapapeles, etc.): resorte hacia el objetivo.
  useEffect(() => {
    if (!lk || reduce) return;
    Animated.spring(v.look, { toValue: lk.x ?? 0, friction: 7, useNativeDriver: true }).start();
    Animated.spring(v.lookY, { toValue: lk.y ?? 0, friction: 7, useNativeDriver: true }).start();
  }, [lk?.x, lk?.y, reduce]);

  function hopNow() {
    if (reduce) return;
    Animated.sequence([
      Animated.parallel([T(v.squash, 1, 110), T(v.hop, 0, 110)]),                       // se agacha
      Animated.parallel([T(v.squash, -1, 130, Easing.out(Easing.quad)), T(v.hop, -size * 0.3, 130, Easing.out(Easing.quad))]), // estira y salta
      Animated.parallel([Animated.spring(v.hop, { toValue: 0, friction: 4, tension: 120, useNativeDriver: true }), Animated.spring(v.squash, { toValue: 0, friction: 4, useNativeDriver: true })]),
    ]).start();
  }
  function winkNow() { Animated.sequence([T(v.wink, 0.08, 90), Animated.delay(240), T(v.wink, 1, 120)]).start(); }
  function wiggle() { Animated.sequence([T(v.rock, 1, 90), T(v.rock, -1, 130), T(v.rock, 1, 130), T(v.rock, 0, 90)]).start(); }
  function spinNow() { v.spin.setValue(0); Animated.timing(v.spin, { toValue: 1, duration: 650, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(); }
  function celebrate() {
    v.conf.setValue(0);
    Animated.timing(v.conf, { toValue: 1, duration: 1100, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    Animated.sequence([
      Animated.delay(60),
      Animated.parallel([T(v.hop, -size * 0.38, 170, Easing.out(Easing.quad)), T(v.squash, -1, 170)]),
      T(v.hop, 0, 150, Easing.in(Easing.quad)),
      T(v.hop, -size * 0.26, 140, Easing.out(Easing.quad)),
      Animated.spring(v.hop, { toValue: 0, friction: 4, useNativeDriver: true }),
      T(v.squash, 0, 120),
    ]).start();
    spinNow();
  }
  // Cada toque dispara otra reacción: salto + guiño, giro, meneo, fiesta.
  const poke = () => {
    if (reduce) return;
    const k = taps.current++ % 4;
    if (k === 0) { hopNow(); winkNow(); } else if (k === 1) spinNow(); else if (k === 2) wiggle(); else celebrate();
  };

  const dim = mood === 'offline' || mood === 'sleep';
  const sx = v.squash.interpolate({ inputRange: [-1, 0, 1], outputRange: [0.92, 1, 1.12] });
  const sy = v.squash.interpolate({ inputRange: [-1, 0, 1], outputRange: [1.1, 1, 0.88] });
  const br = v.breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });
  const fl = v.float.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.05] });
  const tilt = v.tilt.interpolate({ inputRange: [0, 1], outputRange: ['0deg', mood === 'think' ? '10deg' : '-8deg'] });
  const rock = v.rock.interpolate({ inputRange: [-1, 1], outputRange: ['-12deg', '12deg'] });
  const spin = v.spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const shake = v.shake.interpolate({ inputRange: [-1, 1], outputRange: [-size * 0.07, size * 0.07] });
  const ring = { opacity: v.ring.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }), transform: [{ scale: v.ring.interpolate({ inputRange: [0, 1], outputRange: [1, 1.7] }) }] };
  const ew = size * 0.1, eh = mood === 'sleep' || mood === 'offline' ? size * 0.025 : size * 0.13;
  const low = mood === 'sad' || mood === 'oops';
  const eye = (left, wink) => smiling ? (
    <View style={{ position: 'absolute', top: size * (eyePos[2] + 0.02), left: size * left - ew * 0.95, width: ew * 1.9, height: ew * 1.05, borderTopLeftRadius: ew, borderTopRightRadius: ew, borderWidth: ew * 0.5, borderBottomWidth: 0, borderColor: c.bg }} />
  ) : (
    <Animated.View style={{ position: 'absolute', top: size * (low ? eyePos[2] + 0.06 : eyePos[2]), left: size * left - ew / 2, width: ew, height: eh, borderRadius: ew,
      backgroundColor: c.bg, transform: [{ translateX: v.look.interpolate({ inputRange: [-1, 1], outputRange: [-size * 0.05, size * 0.05] }) }, { translateY: v.lookY.interpolate({ inputRange: [-1, 1], outputRange: [-size * 0.04, size * 0.04] }) },
        { scaleY: wink ? Animated.multiply(v.blink, v.wink) : v.blink }] }} />
  );
  return (
    <Pressable onPress={poke} accessibilityRole="button" accessibilityLabel={`Orbi, la mascota. Estado ${mood}. Toca para que reaccione`} hitSlop={8}>
      <Animated.View style={{ width: size, height: size, opacity: dim ? 0.72 : 1, transform: [{ translateX: shake }, { translateY: Animated.add(v.hop, fl) }, { rotate: tilt }, { rotate: rock }, { rotate: spin }, { scaleX: sx }, { scaleY: sy }, { scale: br }] }}>
        {mood === 'happy' && <Animated.View style={[{ position: 'absolute', width: size, height: size, borderRadius: size, borderWidth: 2, borderColor: c.a400 }, ring]} />}
        <View style={{ position: 'absolute', width: size, height: size, borderRadius: size, shadowColor: c.a, shadowOpacity: dim ? 0.15 : 0.6, shadowRadius: size * 0.4, shadowOffset: { width: 0, height: 0 }, elevation: dim ? 0 : 8 }} />
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <Defs>
            <RadialGradient id="g" cx="35%" cy="30%" r="75%">
              <Stop offset="0" stopColor={dim ? c.a600 : c.a300} />
              <Stop offset="0.55" stopColor={dim ? c.a800 : c.a} />
              <Stop offset="1" stopColor={dim ? c.a900 : c.a800} />
            </RadialGradient>
          </Defs>
          <Circle cx="50" cy="50" r="50" fill="url(#g)" />
          <Circle cx="34" cy="24" r="9" fill="#fff" opacity={dim ? 0.06 : 0.16} />
        </Svg>
        {eye(eyePos[0])}{eye(eyePos[1], true)}
        {mood === 'sad' && (
          <Animated.View style={{ position: 'absolute', left: size * eyePos[0] - size * 0.03, top: size * (eyePos[2] + 0.16), width: size * 0.06, height: size * 0.09, borderRadius: size * 0.05, backgroundColor: '#8ecbff',
            opacity: v.tear.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 0] }), transform: [{ translateY: v.tear.interpolate({ inputRange: [0, 1], outputRange: [0, size * 0.22] }) }] }} />
        )}
        {mood === 'think' && (
          <View style={{ position: 'absolute', right: -size * 0.2, top: -size * 0.22, flexDirection: 'row', gap: 3, backgroundColor: c.secContainer, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 6 }}>
            {[0, 1, 2].map((i) => (
              <Animated.View key={i} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.onSecContainer,
                opacity: v.dots.interpolate({ inputRange: [0, i / 3 + 0.001, (i + 1) / 3, 1], outputRange: [0.3, 0.3, 1, 0.3], extrapolate: 'clamp' }) }} />
            ))}
          </View>
        )}
        {mood === 'sleep' && (
          <Animated.Text style={{ position: 'absolute', right: -size * 0.1, top: 0, color: c.primary, fontSize: Math.max(12, size * 0.22), fontWeight: '700',
            opacity: v.z.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 1, 1, 0] }), transform: [{ translateY: v.z.interpolate({ inputRange: [0, 1], outputRange: [8, -size * 0.25] }) }] }}>Z</Animated.Text>
        )}
        {mood === 'cheer' && CONFETI.map((col, i) => {
          const ang = (i / CONFETI.length) * Math.PI * 2, d = size * (0.75 + (i % 3) * 0.18);
          return (
            <Animated.View key={i} pointerEvents="none" style={{ position: 'absolute', left: size / 2 - 4, top: size / 2 - 4, width: 8, height: i % 2 ? 8 : 4, borderRadius: i % 2 ? 4 : 1, backgroundColor: col,
              opacity: v.conf.interpolate({ inputRange: [0, 0.15, 0.8, 1], outputRange: [0, 1, 1, 0] }),
              transform: [{ translateX: v.conf.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(ang) * d] }) }, { translateY: v.conf.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(ang) * d + size * 0.25] }) },
                { rotate: v.conf.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${(i + 1) * 120}deg`] }) }] }} />
          );
        })}
      </Animated.View>
    </Pressable>
  );
}

// Orbi asomándose desde la esquina inferior izquierda: ~40% del cuerpo, ambos ojos dentro. El borde plano de abajo coincide con el borde de pantalla / barra.
// Mira hacia `look`, parpadea con ambos ojos y sube más (`excited`).
export function PeekMascot({ size = 112, look, excited, onPress, mood = 'idle', style }) {
  const out = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.spring(out, { toValue: excited ? 1 : 0, friction: 6, tension: 80, useNativeDriver: false }).start(); }, [excited]);
  const h = out.interpolate({ inputRange: [0, 1], outputRange: [size * 0.65, size * 0.87] }); // +0.15 de margen arriba para respirar/flotar sin recorte
  return (
    <Animated.View pointerEvents="box-none" style={[{ position: 'absolute', left: 0, width: size * 1.5, height: Animated.add(h, size * 0.55), overflow: 'hidden' }, style]}>
      <View style={{ position: 'absolute', left: -size * 0.28, top: size * 0.7 }}>
        <Mascot size={size} mood={mood} look={look} eyePos={[0.5, 0.76, 0.28]} />
      </View>
    </Animated.View>
  );
}
