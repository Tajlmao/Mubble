"""Decode genuine NOAA GFS GRIB2 fields. No synthetic production data."""
import sys, json, tempfile, os
import eccodes as ec
fields={}; meta=None; accumulation=None
with tempfile.NamedTemporaryFile(suffix='.grib2') as file:
    file.write(sys.stdin.buffer.read()); file.flush()
    with open(file.name,'rb') as source:
        while True:
            handle=ec.codes_grib_new_from_file(source)
            if handle is None: break
            try:
                name=ec.codes_get(handle,'shortName')
                level=ec.codes_get(handle,'level')
                key={'2t':'temperature','2r':'humidity','10u':'u','10v':'v','prmsl':'pressure','msl':'pressure','tp':'precipitation'}.get(name)
                if not key: continue
                nx=int(ec.codes_get(handle,'Ni'));ny=int(ec.codes_get(handle,'Nj'))
                values=ec.codes_get_values(handle).tolist()
                if key=='temperature': values=[v-273.15 for v in values]
                if key=='pressure': values=[v/100 for v in values]
                # NOAA 1-degree GFS has west-to-east, north-to-south scanning.
                if ec.codes_get(handle,'iScansNegatively') or ec.codes_get(handle,'jScansPositively'): raise ValueError('Unsupported grid scanning direction')
                # Keep the genuine global grid; no meteorological interpolation here.
                fields[key]=[round(v,3) if abs(v)<1e10 else None for v in values]
                date=str(ec.codes_get(handle,'dataDate')); hour=int(ec.codes_get(handle,'dataTime'))//100
                validity=str(ec.codes_get(handle,'validityDate'));validhour=int(ec.codes_get(handle,'validityTime'))//100
                meta={'nx':nx,'ny':ny,'lon0':ec.codes_get(handle,'longitudeOfFirstGridPointInDegrees'),'lat0':ec.codes_get(handle,'latitudeOfFirstGridPointInDegrees'), 'dx':ec.codes_get(handle,'iDirectionIncrementInDegrees'),'dy':-ec.codes_get(handle,'jDirectionIncrementInDegrees'), 'cycle':f'{date[:4]}-{date[4:6]}-{date[6:]}T{hour:02}:00:00Z','valid':f'{validity[:4]}-{validity[4:6]}-{validity[6:]}T{validhour:02}:00:00Z'}
                if key=='precipitation': accumulation={'start':int(ec.codes_get(handle,'startStep')),'end':int(ec.codes_get(handle,'endStep'))}
            finally: ec.codes_release(handle)
if not meta or not fields: raise ValueError('No supported GFS fields found')
print(json.dumps({**meta,'fields':fields,'accumulation':accumulation,'attribution':'NOAA / NCEP GFS · 1° global grid'},separators=(',',':'),allow_nan=False))
