import json, numpy as np, soundfile as sf
SR = 24000
starts = [0.3,3.196,7.756,11.932,17.089,19.9,23.628,28.295]; TOTAL = 36.196; OFF = 0.15
N = int((TOTAL + .2) * SR)

# --- voz ---
voice = np.zeros(N)
for i, st in enumerate(starts):
    v, sr = sf.read(f"em_alex_{i:02d}.wav"); assert sr == SR
    a = int((st + OFF) * SR); voice[a:a+len(v)] += v[:N-a]

# --- marimba sintetizada (instrumento típico de Chiapas) ---
def note(midi, dur=0.9, amp=1.0):
    f = 440 * 2 ** ((midi - 69) / 12); t = np.arange(int(dur * SR)) / SR
    env = np.minimum(t / .004, 1) * np.exp(-t * 5.5)
    s = np.sin(2*np.pi*f*t) + .35*np.sin(2*np.pi*f*3.93*t)*np.exp(-t*18) + .08*np.sin(2*np.pi*f*9.2*t)*np.exp(-t*40)
    return amp * env * s
music = np.zeros(N)
def put(t, midi, amp=1.0, dur=0.9):
    a = int(t * SR); n = note(midi, dur, amp)[:max(0, N-a)]; music[a:a+len(n)] += n
bpm = 132; beat = 60 / bpm          # 3/4, vals ranchero/son
G = 55                               # G3
prog = [(0, [0,4,7]), (5, [5,9,12]), (7, [7,11,14]), (0, [0,4,7])]  # I IV V I
t = 0.0; bar = 0
while t < TOTAL - 1.2:
    root, ch = prog[(bar // 2) % 4]
    put(t, G + root - 12, .9, 1.2)                       # bajo en el 1
    for k in (1, 2):                                     # acordes en 2 y 3
        for c in ch: put(t + k*beat, G + c, .28)
    mel = [ch[2]+12, ch[1]+12, ch[0]+12] if bar % 2 == 0 else [ch[1]+12, ch[2]+12, ch[1]+12]
    for k, m in enumerate(mel): put(t + k*beat + beat/2, G + m, .22, .5)  # contratiempo melódico
    t += 3*beat; bar += 1
# acorde final
for c in [0,4,7,12]: put(TOTAL - 1.4, G + c, .5, 1.6)
music /= np.abs(music).max()

# ducking: baja la música cuando habla la voz
env = np.abs(voice); w = int(.25*SR)
env = np.convolve(env, np.ones(w)/w, mode='same'); env = np.clip(env / (env.max()*.15), 0, 1)
gain = 0.30 - 0.20*env
fade = np.ones(N); fl = int(.8*SR); fade[-fl:] = np.linspace(1, 0, fl); fade[:int(.3*SR)] = np.linspace(0,1,int(.3*SR))
mix = voice / np.abs(voice).max() * .9 + music * gain * fade
mix /= np.abs(mix).max() * 1.12
sf.write("mix.wav", mix, SR)
print("ok", len(mix)/SR)
