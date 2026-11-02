"""Convertit le DXF de mise à plat (plaque carbone) en trajectoire de découpe compacte.

Usage : python3 cutsheet.py <mise-a-plat.dxf> <sortie.json>
Sortie : {w, h, parts, outer, paths} ; chaque chemin est une liste plate de coordonnées
en dixièmes de mm, encodées en deltas. Ordre : pièce par pièce, perçages
intérieurs d'abord puis contour extérieur, comme sur une découpeuse laser.
"""
import json, math, sys
import ezdxf
from ezdxf import path as zpath, bbox

src, out = sys.argv[1:3]
doc = ezdxf.readfile(src)
ents = [e for e in doc.modelspace() if e.dxftype() in ('POLYLINE', 'LWPOLYLINE', 'LINE', 'ARC', 'CIRCLE', 'SPLINE')]
ext = bbox.extents(ents)
X0, Y0 = ext.extmin.x, ext.extmin.y
W, H = ext.size.x, ext.size.y

def rdp(pts, eps):
    if len(pts) < 3:
        return pts
    (x1, y1), (x2, y2) = pts[0], pts[-1]
    dx, dy = x2 - x1, y2 - y1
    n = math.hypot(dx, dy) or 1e-9
    i, dmax = 0, 0.0
    for k in range(1, len(pts) - 1):
        d = abs(dy * pts[k][0] - dx * pts[k][1] + x2 * y1 - y2 * x1) / n
        if d > dmax:
            i, dmax = k, d
    if dmax > eps:
        return rdp(pts[:i + 1], eps)[:-1] + rdp(pts[i:], eps)
    return [pts[0], pts[-1]]

polys = []
for e in ents:
    pts = [(q.x - X0, H - (q.y - Y0)) for q in zpath.make_path(e).flattening(0.05)]
    if len(pts) < 2:
        continue
    closed = math.hypot(pts[0][0] - pts[-1][0], pts[0][1] - pts[-1][1]) < 0.05
    if closed:
        # boucle fermée : on coupe au point le plus éloigné pour que RDP fonctionne
        far = max(range(len(pts)), key=lambda k: math.dist(pts[0], pts[k]))
        pts = rdp(pts[:far + 1], 0.06)[:-1] + rdp(pts[far:], 0.06)
        if pts[0] != pts[-1]:
            pts.append(pts[0])
    else:
        pts = rdp(pts, 0.06)
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    polys.append({'pts': pts, 'bb': (min(xs), min(ys), max(xs), max(ys))})

def area(bb):
    return (bb[2] - bb[0]) * (bb[3] - bb[1])

def inside(a, b):
    return a[0] >= b[0] - 1e-6 and a[1] >= b[1] - 1e-6 and a[2] <= b[2] + 1e-6 and a[3] <= b[3] + 1e-6

def pip(pt, poly):
    x, y = pt; c = False
    for (x1, y1), (x2, y2) in zip(poly, poly[1:]):
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
            c = not c
    return c

# Les contours extérieurs sont ceux qui ne sont contenus dans aucun autre.
order = sorted(range(len(polys)), key=lambda i: -area(polys[i]['bb']))
parent = {}
outers = []
for i in order:
    p = polys[i]
    host = None
    for j in outers:
        if inside(p['bb'], polys[j]['bb']) and pip(p['pts'][0], polys[j]['pts']):
            host = j
            break
    if host is None:
        outers.append(i)
    else:
        parent[i] = host
children = {j: [] for j in outers}
for i, j in parent.items():
    children[j].append(i)

def centre(i):
    bb = polys[i]['bb']
    return ((bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2)

# Parcours de la plaque en bandes verticales, en serpentin.
BAND = 140.0
def key(i):
    cx, cy = centre(i)
    b = int(cx // BAND)
    return (b, cy if b % 2 == 0 else -cy)
outers.sort(key=key)

seq = []
for j in outers:
    holes = children[j]
    cur = polys[j]['pts'][0]
    while holes:
        k = min(holes, key=lambda h: math.dist(cur, polys[h]['pts'][0]))
        holes.remove(k)
        seq.append(k)
        cur = polys[k]['pts'][0]
    seq.append(j)

paths = []
for i in seq:
    flat, px, py = [], 0, 0
    for x, y in polys[i]['pts']:
        ix, iy = round(x * 10), round(y * 10)
        flat += [ix - px, iy - py]
        px, py = ix, iy
    paths.append(flat)

outer_idx = [k for k, i in enumerate(seq) if i in children]
json.dump({'w': round(W, 1), 'h': round(H, 1), 'parts': len(outers), 'outer': outer_idx, 'paths': paths}, open(out, 'w'), separators=(',', ':'))
npts = sum(len(p) // 2 for p in paths)
L = 0.0
for i in seq:
    pts = polys[i]['pts']
    L += sum(math.dist(a, b) for a, b in zip(pts, pts[1:]))
print(f'{len(paths)} contours, {len(outers)} pièces, {npts} points, coupe {L/1000:.2f} m', file=sys.stderr)
