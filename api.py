"""Optional FastAPI wrapper around the Evidence Engine (the web app does not need it).
    uvicorn api:app --reload      POST /analyze  {"y": [...], "start_year": 1981, "units": "mm/day"}"""
import os, numpy as np
from fastapi import FastAPI
from pydantic import BaseModel
from trendsleuth import engine as E, io

app = FastAPI(title="TrendSleuth Evidence Engine")

class Series(BaseModel):
    y: list[float | None]
    start_year: int = 1981
    units: str = ""
    name: str = ""
    second: list[float | None] | None = None
    second_start_year: int | None = None

def _arr(v):
    return np.array([np.nan if x is None else x for x in v], float)

@app.post("/analyze")
def analyze(s: Series):
    y = _arr(s.y)
    n34, _ = io.noaa_nino34()
    n12, _ = io.noaa_nino34(os.path.join(io.DATA, "noaa_nina12_anom.txt"))
    drivers = {"Nino 3.4": io.align_nino(n34, s.start_year, len(y)), "Nino 1+2": io.align_nino(n12, s.start_year, len(y))}
    kw = {}
    if s.second is not None and s.second_start_year:
        kw = dict(second=_arr(s.second), second_start=(s.second_start_year, 1))
    return E.clean(E.analyze(y, nino=drivers, start_year=s.start_year, units=s.units, name=s.name, **kw))
