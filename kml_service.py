"""
Générateur de cartographie 3D pour Google Earth (.KML)
Extrusion verticale proportionnelle à la puissance électromagnétique (dBm)
"""

def generate_kml_3d(records: list) -> str:
    """Génère un document KML 3D avec piliers d'ondes et tracé extrudé."""
    
    kml = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<kml xmlns="http://www.opengis.net/kml/2.2">',
        '<Document>',
        '  <name>Radio Sentinel - Cartographie 3D des Ondes Cellulaires</name>',
        '  <description>Relevés de couverture RF géolocalisés avec extrusion 3D proportionnelle au dBm.</description>',
        '  <!-- Styles de couleurs selon la puissance (Format KML: aabbggrr) -->',
        '  <Style id="signal-excellent">',
        '    <IconStyle><color>ffd4b606</color><scale>1.1</scale></IconStyle>',
        '    <LineStyle><color>ffd4b606</color><width>3</width></LineStyle>',
        '    <PolyStyle><color>7fd4b606</color></PolyStyle>',
        '  </Style>',
        '  <Style id="signal-good">',
        '    <IconStyle><color>ff81b910</color><scale>1.0</scale></IconStyle>',
        '    <LineStyle><color>ff81b910</color><width>2.5</width></LineStyle>',
        '    <PolyStyle><color>7f81b910</color></PolyStyle>',
        '  </Style>',
        '  <Style id="signal-medium">',
        '    <IconStyle><color>ff08b3ea</color><scale>0.9</scale></IconStyle>',
        '    <LineStyle><color>ff08b3ea</color><width>2</width></LineStyle>',
        '    <PolyStyle><color>7f08b3ea</color></PolyStyle>',
        '  </Style>',
        '  <Style id="signal-weak">',
        '    <IconStyle><color>ff2626dc</color><scale>0.8</scale></IconStyle>',
        '    <LineStyle><color>ff2626dc</color><width>1.5</width></LineStyle>',
        '    <PolyStyle><color>7f2626dc</color></PolyStyle>',
        '  </Style>',
        '  <Folder>',
        '    <name>Piliers d\'Ondes 3D (dBm)</name>'
    ]

    path_coords = []

    for r in records:
        lat = r.get("latitude")
        lon = r.get("longitude")
        dbm = r.get("dbm")
        if lat is None or lon is None or dbm is None:
            continue

        # Hauteur d'extrusion : 20m (signal très faible) à 300m (signal crête)
        # Formule : (dBm - (-115)) * 4.5
        height = max(15.0, round((dbm - (-115)) * 4.5, 1))
        path_coords.append(f"{lon},{lat},{height}")

        # Choix du style
        if dbm >= -75:
            style_id = "signal-excellent"
            qual = "Excellent"
        elif dbm >= -85:
            style_id = "signal-good"
            qual = "Bon"
        elif dbm >= -95:
            style_id = "signal-medium"
            qual = "Moyen"
        else:
            style_id = "signal-weak"
            qual = "Faible / Critique"

        time_str = r.get("timestamp", "").replace("T", " ")[:19]
        cell_id = r.get("cell_id") or "--"
        lac = r.get("lac") or "--"
        op = r.get("operator_name") or "Cellulaire"

        kml.append(f"""    <Placemark>
      <name>{dbm} dBm ({qual})</name>
      <description><![CDATA[
        <b>Horodatage:</b> {time_str}<br/>
        <b>Opérateur:</b> {op}<br/>
        <b>Puissance:</b> {dbm} dBm (CSQ {r.get('csq')}/31)<br/>
        <b>Cell ID:</b> {cell_id} (LAC: {lac})<br/>
        <b>Canal:</b> {r.get('channel') or '--'}<br/>
        <b>Hauteur 3D:</b> {height} m au-dessus du sol
      ]]></description>
      <styleUrl>#{style_id}</styleUrl>
      <Point>
        <extrude>1</extrude>
        <altitudeMode>relativeToGround</altitudeMode>
        <coordinates>{lon},{lat},{height}</coordinates>
      </Point>
    </Placemark>""")

    kml.append('  </Folder>')

    # Ruban 3D du parcours continu
    if len(path_coords) >= 2:
        kml.append('  <Folder>')
        kml.append('    <name>Parcours 3D Extrudé</name>')
        kml.append('    <Placemark>')
        kml.append('      <name>Trajectoire Électromagnétique 3D</name>')
        kml.append('      <styleUrl>#signal-excellent</styleUrl>')
        kml.append('      <LineString>')
        kml.append('        <extrude>1</extrude>')
        kml.append('        <tessellate>1</tessellate>')
        kml.append('        <altitudeMode>relativeToGround</altitudeMode>')
        kml.append(f'        <coordinates>{" ".join(path_coords)}</coordinates>')
        kml.append('      </LineString>')
        kml.append('    </Placemark>')
        kml.append('  </Folder>')

    kml.append('</Document>')
    kml.append('</kml>')

    return "\n".join(kml)
