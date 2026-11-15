"""Unpack a .tspk file (raw zarr chunks fetched from the public NASA POWER S3 bucket)
and decode it into a numpy array.  Usage: python unpack_tspk.py file.tspk [out.npy]"""
import sys, json, struct, numpy as np
from numcodecs import get_codec

def read_tspk(path):
    with open(path, "rb") as f:
        assert f.read(4) == b"TSPK"
        (hl,) = struct.unpack("<I", f.read(4))
        header = json.loads(f.read(hl))
        blob = f.read()
    return header, blob

def decode(path):
    header, blob = read_tspk(path)
    ent = {e["key"].split("/", 1)[1]: e for e in header["entries"]}
    za = json.loads(blob[ent[".zarray"]["offset"]: ent[".zarray"]["offset"] + ent[".zarray"]["length"]])
    zt = json.loads(blob[ent[".zattrs"]["offset"]: ent[".zattrs"]["offset"] + ent[".zattrs"]["length"]])
    shape, chunks = za["shape"], za["chunks"]
    comp = get_codec(za["compressor"]) if za["compressor"] else None
    filters = [get_codec(f) for f in (za["filters"] or [])]
    dtype = np.dtype(za["dtype"])
    fill = za["fill_value"]
    out = np.full(shape, np.nan if dtype.kind == "f" else 0, dtype=dtype)
    sep = za.get("dimension_separator", ".")
    n = 0
    for key, e in ent.items():
        if key.startswith(".z"):
            continue
        idx = [int(i) for i in key.split(sep)]
        raw = blob[e["offset"]: e["offset"] + e["length"]]
        buf = comp.decode(raw) if comp else raw
        for flt in reversed(filters):
            buf = flt.decode(buf)
        arr = np.frombuffer(buf, dtype=dtype).reshape(chunks)
        sl = tuple(slice(i * c, min((i + 1) * c, s)) for i, c, s in zip(idx, chunks, shape))
        out[sl] = arr[tuple(slice(0, s.stop - s.start) for s in sl)]
        n += 1
    return out, za, zt, header, n

if __name__ == "__main__":
    a, za, zt, h, n = decode(sys.argv[1])
    print(h["var"], a.shape, a.dtype, "chunks:", n, "| attrs:", {k: zt.get(k) for k in ("long_name", "units")})
    if len(sys.argv) > 2:
        np.save(sys.argv[2], a)
