"""Build data/geo/places.topo.json: simplified country and province borders used to name a place and to draw borders.

Source: Natural Earth 1:10m Admin 1 - States, Provinces (public domain), from
        https://github.com/nvkelso/natural-earth-vector (geojson/ne_10m_admin_1_states_provinces.geojson).
Needs:  Node.js (npx mapshaper).   Usage: python scripts/build_places.py [path/to/ne_10m_admin_1_states_provinces.geojson]
Then run scripts/build_web_data.py to copy the result into web/data/.
"""
import json, os, subprocess, sys, tempfile, urllib.request

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
URL = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson"
RAW = os.path.join(ROOT, "data", "raw", "ne_10m_admin_1_states_provinces.geojson")
OUT = os.path.join(ROOT, "data", "geo", "places.topo.json")
# Errors we found in the source and checked by hand against the official map of Ecuador (INEC):
# the labels of Napo and Tungurahua are swapped, and some accents are missing.
FIX = {("Ecuador", "Napo"): "Tungurahua", ("Ecuador", "Tungurahua"): "Napo", ("Ecuador", "Sucumbios"): "Sucumbíos", ("Ecuador", "Manabi"): "Manabí",
       ("Ecuador", "Bolivar"): "Bolívar", ("Ecuador", "Los Rios"): "Los Ríos"}

def main():
    src = sys.argv[1] if len(sys.argv) > 1 else RAW
    if not os.path.exists(src):
        os.makedirs(os.path.dirname(src), exist_ok=True); print("downloading", URL); urllib.request.urlretrieve(URL, src)
    d = json.load(open(src, encoding="utf-8")); n = 0
    for f in d["features"]:
        p = f["properties"]; key = (p.get("admin"), p.get("name"))
        if key in FIX: p["name"] = FIX[key]; n += 1
        f["properties"] = {"name": p.get("name") or "", "admin": p.get("admin")}
    print("features", len(d["features"]), "names corrected", n)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        a, prov, ctry = (os.path.join(tmp, x) for x in ("a.geojson", "prov.geojson", "ctry.geojson"))
        json.dump(d, open(a, "w", encoding="utf-8"))
        run = lambda *args: subprocess.run(["npx", "--yes", "mapshaper", *args], check=True)
        run(a, "-simplify", "6%", "keep-shapes", "-clean", "-o", prov)
        run(prov, "-dissolve", "admin", "-o", ctry)
        run("-i", prov, ctry, "combine-files", "-o", OUT, "format=topojson", "quantization=20000")
    print(OUT, f"{os.path.getsize(OUT) / 1024:.0f} kB")

if __name__ == "__main__":
    main()
