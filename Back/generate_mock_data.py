import psycopg2
from datetime import datetime
import random
import time

conn = psycopg2.connect(host="localhost", database="postgres", user="postgres", password="12345")
conn.autocommit = False
cursor = conn.cursor()

# ── helpers ───────────────────────────────────────────────────────────────────

def cable_id():
    time.sleep(0.001)
    return f"{int(datetime.now().timestamp()*1000)}_{random.randint(1000,9999)}"

def get_port_id(cabinet_id, port_number):
    cursor.execute("SELECT id FROM ports WHERE cabinet_id = %s AND port_number = %s", (cabinet_id, port_number))
    row = cursor.fetchone()
    return row[0] if row else None

def is_port_free(port_id, side):
    col = "status_front" if side == "front" else "status_back"
    cursor.execute(f"SELECT {col} FROM ports WHERE id = %s", (port_id,))
    row = cursor.fetchone()
    return row and row[0] == 'available'

def mark_port_occupied(port_id, side):
    col = "status_front" if side == "front" else "status_back"
    cursor.execute(f"UPDATE ports SET {col} = 'occupied' WHERE id = %s", (port_id,))

def add_cable(cab1, cab2, name, side, port1, port2, network="VLAN-10"):
    cid = cable_id()
    p1 = get_port_id(cab1, port1)
    p2 = get_port_id(cab2, port2)
    if not p1:
        print(f"  ⚠ skip '{name}': port {port1} not found in {cab1}")
        return None
    if not p2:
        print(f"  ⚠ skip '{name}': port {port2} not found in {cab2}")
        return None
    if not is_port_free(p1, side):
        print(f"  ⚠ skip '{name}': port {port1} {side} in {cab1} occupied")
        return None
    if not is_port_free(p2, side):
        print(f"  ⚠ skip '{name}': port {port2} {side} in {cab2} occupied")
        return None
    cursor.execute(
        "INSERT INTO cables (cableID, number, num_of_fibers, cable_type, cabinet1, cabinet2, cabinet1_start, cabinet2_start) VALUES (%s,%s,%s,%s,%s,%s,%s,%s)",
        (cid, name, 1, "Single", cab1, cab2, port1, port2)
    )
    cursor.execute(
        "INSERT INTO fibers (number_cabinet1, number_cabinet2, fiber_type, cable_id, port_cabinet1_id, port_cabinet2_id, side, network) VALUES (%s,%s,%s,%s,%s,%s,%s,%s)",
        (port1, port2, "0", cid, p1, p2, side, network)
    )
    mark_port_occupied(p1, side)
    mark_port_occupied(p2, side)
    print(f"  ✓ {name}: {cab1}:{port1} -[{side}]-> {cab2}:{port2}")
    return cid

def add_cabinet(building_id, identifier, cab_type, parent=None, port_count=0):
    cursor.execute(
        "INSERT INTO cabinets (identifier, cabinet_type, building_id, parent_cabinet, port_count) VALUES (%s,%s,%s,%s,%s)",
        (identifier, cab_type, building_id, parent, port_count)
    )
    if port_count > 0:
        for p in range(1, port_count + 1):
            cursor.execute(
                "INSERT INTO ports (cabinet_id, port_number, status_back, status_front) VALUES (%s,%s,'available','available')",
                (identifier, p)
            )

# ── wipe everything ───────────────────────────────────────────────────────────

print("Wiping existing data...")
cursor.execute("DELETE FROM buildings")
conn.commit()
print("Wiped.")

# ── building names ────────────────────────────────────────────────────────────

neighborhoods = [
    "הכרמל", "נווה שאנן", "רמות", "רמת ביאליק", "קריית ביאליק",
    "קריית ים", "קריית מוצקין", "קריית אתא", "נשר", "טירת כרמל",
    "עספיא", "דלית אל כרמל", "אבו גוש", "מבשרת ציון", "בית שמש",
    "מודיעין", "לוד", "רמלה", "יבנה", "אשדוד",
    "קריית גת", "קריית מלאכי", "אופקים", "נתיבות", "שדרות",
    "אילת", "מצפה רמון", "דימונה", "ירוחם", "אשקלון"
]

NETWORKS = ["ניהול", "נתונים", "VLAN-10", "VLAN-20", "גיבוי"]

# ── create buildings ──────────────────────────────────────────────────────────

print("Creating buildings...")
cursor.execute("INSERT INTO buildings (name, display_order) VALUES (%s,%s) RETURNING id", ("מרכז ראשי", 0))
main_id = cursor.fetchone()[0]

cursor.execute("INSERT INTO buildings (name, display_order) VALUES (%s,%s) RETURNING id", ("מרכז גיבוי", 1))
backup_id = cursor.fetchone()[0]

neighborhood_ids = {}
for i, name in enumerate(neighborhoods):
    cursor.execute("INSERT INTO buildings (name, display_order) VALUES (%s,%s) RETURNING id", (name, i + 2))
    neighborhood_ids[name] = cursor.fetchone()[0]

conn.commit()
print("Buildings created.")

# ── cabinet helpers ───────────────────────────────────────────────────────────

def pa(b):  return f"{b}-פאנל-1A"
def pb(b):  return f"{b}-פאנל-1B"
def rtr(b): return f"{b}-נתב-1"
def sw(b):  return f"{b}-מתג-1"
def bb(b):  return f"{b}-באקבון-1"
def aron(b): return f"{b}-ארון-1"

def setup_main_building(building_id, prefix):
    cabinets = []
    for i in range(1, 11):
        aron_id  = f"{prefix}-ארון-{i}"
        panel_a  = f"{prefix}-פאנל-{i}A"
        panel_b  = f"{prefix}-פאנל-{i}B"
        backbone = f"{prefix}-באקבון-{i}"
        router   = f"{prefix}-נתב-{i}"
        switch   = f"{prefix}-מתג-{i}"
        add_cabinet(building_id, aron_id,  "ארון")
        add_cabinet(building_id, panel_a,  "פאנל",   parent=aron_id, port_count=24)
        add_cabinet(building_id, panel_b,  "פאנל",   parent=aron_id, port_count=24)
        add_cabinet(building_id, backbone, "באקבון", parent=aron_id, port_count=24)
        add_cabinet(building_id, router,   "נתב",    parent=aron_id, port_count=24)
        add_cabinet(building_id, switch,   "מתג",    parent=aron_id, port_count=24)
        cabinets.append({"aron": aron_id, "panel_a": panel_a, "panel_b": panel_b,
                         "backbone": backbone, "router": router, "switch": switch})
    return cabinets

def setup_neighborhood(building_id, prefix):
    cabinets = []
    for i in range(1, 4):
        aron_id = f"{prefix}-ארון-{i}"
        panel_a = f"{prefix}-פאנל-{i}A"
        panel_b = f"{prefix}-פאנל-{i}B"
        router  = f"{prefix}-נתב-{i}"
        switch  = f"{prefix}-מתג-{i}"
        add_cabinet(building_id, aron_id, "ארון")
        add_cabinet(building_id, panel_a, "פאנל", parent=aron_id, port_count=24)
        add_cabinet(building_id, panel_b, "פאנל", parent=aron_id, port_count=24)
        add_cabinet(building_id, router,  "נתב",  parent=aron_id, port_count=24)
        add_cabinet(building_id, switch,  "מתג",  parent=aron_id, port_count=24)
        cabinets.append({"aron": aron_id, "panel_a": panel_a, "panel_b": panel_b,
                         "router": router, "switch": switch})
    return cabinets

# ── create cabinets ───────────────────────────────────────────────────────────

print("Setting up main building...")
main_cabs = setup_main_building(main_id, "ראשי")
conn.commit()

print("Setting up backup building...")
backup_cabs = setup_main_building(backup_id, "גיבוי")
conn.commit()

neighborhood_cabs = {}
for name, bid in neighborhood_ids.items():
    neighborhood_cabs[name] = setup_neighborhood(bid, name)
    print(f"  {name} cabinets ready")
conn.commit()
print("All cabinets created.")

# ── front connections: router/switch -> panels ────────────────────────────────

print("\nCreating front connections...")

def make_front_connections(cabs_list):
    for cab in cabs_list:
        network = random.choice(NETWORKS)
        add_cable(cab["router"], cab["panel_a"], f"F-R-{cab['router']}-1", "front", 1, 1, network)
        add_cable(cab["router"], cab["panel_a"], f"F-R-{cab['router']}-2", "front", 2, 2, network)
        add_cable(cab["switch"],  cab["panel_b"], f"F-S-{cab['switch']}-1",  "front", 1, 1, network)
        add_cable(cab["switch"],  cab["panel_b"], f"F-S-{cab['switch']}-2",  "front", 2, 2, network)

make_front_connections(main_cabs)
make_front_connections(backup_cabs)
for name, cabs in neighborhood_cabs.items():
    make_front_connections(cabs)
conn.commit()
print("Front connections done.")

# ── back connections: neighborhoods -> main/backup backbone ───────────────────

print("\nCreating neighborhood->backbone connections...")
main_backbone   = main_cabs[0]["backbone"]
backup_backbone = backup_cabs[0]["backbone"]
back_port_main   = 3
back_port_backup = 3

for name, cabs in neighborhood_cabs.items():
    network = random.choice(NETWORKS)
    cab = cabs[0]
    if back_port_main <= 22:
        add_cable(cab["panel_a"], main_backbone,   f"B-{name}-main",   "back", 3, back_port_main,   network)
        back_port_main += 2
    if back_port_backup <= 22:
        add_cable(cab["panel_b"], backup_backbone, f"B-{name}-backup", "back", 3, back_port_backup, network)
        back_port_backup += 2
conn.commit()
print("Neighborhood->backbone connections done.")

# ── intra-main chaining ───────────────────────────────────────────────────────

print("\nCreating intra-main connections...")
for i in range(len(main_cabs) - 1):
    network = random.choice(NETWORKS)
    add_cable(main_cabs[i]["panel_b"], main_cabs[i+1]["panel_a"], f"INTRA-main-{i}", "back", 5, 5, network)
for i in range(len(backup_cabs) - 1):
    network = random.choice(NETWORKS)
    add_cable(backup_cabs[i]["panel_b"], backup_cabs[i+1]["panel_a"], f"INTRA-backup-{i}", "back", 5, 5, network)
conn.commit()
print("Intra-main connections done.")

# ── long cross-building path (12 buildings) ───────────────────────────────────
# Pattern:
# rtr(B1) -[front]-> pA(B1) -[back]-> pA(B2) -[front]-> pB(B2) -[back]->
# pA(B3) -[front]-> pB(B3) -[back]-> pA(B4) -[front]-> pB(B4) -[back]->
# ... -[back]-> pA(B12) -[front]-> rtr(B12)

print("\nCreating 12-building long path...")

chain = list(neighborhood_cabs.keys())[:12]
network = "VLAN-10"
PORT = 5  # using port 5 to avoid conflicts with front connections on ports 1,2

# Step 1: router(B1) -[front]-> panel_a(B1)
add_cable(
    neighborhood_cabs[chain[0]][0]["router"],
    neighborhood_cabs[chain[0]][0]["panel_a"],
    "LONG-START", "front", PORT, PORT, network
)

# Steps 2..N-1: alternating back then front through each building
for i in range(len(chain) - 1):
    cur_pa = neighborhood_cabs[chain[i]][0]["panel_a"]
    cur_pb = neighborhood_cabs[chain[i]][0]["panel_b"]
    nxt_pa = neighborhood_cabs[chain[i+1]][0]["panel_a"]
    nxt_pb = neighborhood_cabs[chain[i+1]][0]["panel_b"]
    nxt_rtr = neighborhood_cabs[chain[i+1]][0]["router"]
    is_last = (i == len(chain) - 2)

    # Determine which panel we're currently on
    # B1: came from router via front on panel_a -> continue back from panel_a
    # B2+: came via back on panel_a -> continue front to panel_b, then back from panel_b
    if i == 0:
        # panel_a(B1) -[back]-> panel_a(B2)
        add_cable(cur_pa, nxt_pa, f"LONG-BACK-{i}", "back", PORT, PORT, network)
    else:
        # panel_b(Bi) -[back]-> panel_a(Bi+1)
        add_cable(cur_pb, nxt_pa, f"LONG-BACK-{i}", "back", PORT, PORT, network)

    if is_last:
        # panel_a(B12) -[front]-> router(B12)
        add_cable(nxt_pa, nxt_rtr, "LONG-END", "front", PORT, PORT, network)
    else:
        # panel_a(Bi+1) -[front]-> panel_b(Bi+1)
        add_cable(nxt_pa, nxt_pb, f"LONG-FRONT-{i}", "front", PORT, PORT, network)

conn.commit()
print("Long path created.")

print("\n✅ All done!")
print(f"\nLong path buildings ({len(chain)}):")
for i, b in enumerate(chain):
    print(f"  {i+1}. {b}")
print(f"\nTo test: open modal for {chain[0]}-ארון-1")
print(f"Click {chain[0]}-נתב-1 then click port {PORT}")
print(f"Expected endpoint: {chain[-1]}-נתב-1 port {PORT}")

cursor.close()
conn.close()