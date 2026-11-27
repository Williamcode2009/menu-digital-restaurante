import sys, json, soundfile as sf
from kokoro_onnx import Kokoro
k = Kokoro("kokoro-v1.0.int8.onnx", "voices-v1.0.bin")
voice, speed, out = sys.argv[1], float(sys.argv[2]), sys.argv[3]
lines = json.load(open("guion.json"))
durs = []
for i, t in enumerate(lines):
    s, sr = k.create(t, voice=voice, speed=speed, lang="es")
    sf.write(f"{out}_{i:02d}.wav", s, sr); durs.append(round(len(s)/sr, 3))
json.dump(durs, open(f"{out}_durs.json", "w")); print(durs, sum(durs))
