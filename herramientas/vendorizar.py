"""Copia three.js y las fuentes desde node_modules a vendor/ y deja index.html sin CDN.

Uso (desde la raíz del proyecto, tras `npm install`): python3 herramientas/vendorizar.py
"""
import os
import shutil

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(RAIZ)

FAMILIAS = {
    "overpass": ("Overpass", [400, 600, 800]),
    "overpass-mono": ("Overpass Mono", [500, 700]),
    "saira-extra-condensed": ("Saira Extra Condensed", [600, 800]),
}

os.makedirs("vendor/fuentes", exist_ok=True)
shutil.copy("node_modules/three/build/three.min.js", "vendor/three.min.js")

css = ""
for clave, (nombre, pesos) in FAMILIAS.items():
    for peso in pesos:
        archivo = "%s-latin-%d-normal.woff2" % (clave, peso)
        shutil.copy("node_modules/@fontsource/%s/files/%s" % (clave, archivo), "vendor/fuentes/" + archivo)
        css += ("@font-face{font-family:'%s';font-weight:%d;font-style:normal;font-display:swap;"
                "src:url('%s') format('woff2')}\n" % (nombre, peso, archivo))
open("vendor/fuentes/fuentes.css", "w").write(css)

s = open("v12/index.html").read()
if "fonts.googleapis.com" in s:
    a = s.index('<link rel="preconnect" href="https://fonts.googleapis.com">')
    cierre = 'rel="stylesheet">'
    b = s.index(cierre, a) + len(cierre)
    s = s[:a] + '<link rel="stylesheet" href="../vendor/fuentes/fuentes.css">' + s[b:]
s = s.replace("https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js", "../vendor/three.min.js")
open("v12/index.html", "w").write(s)
print("listo")
