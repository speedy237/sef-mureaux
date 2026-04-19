#!/usr/bin/env python3
"""
Génère les icônes PWA à partir d'un fichier SVG
Nécessite: pip install cairosvg pillow
"""

try:
    import cairosvg
    from PIL import Image
    import io
    import os
except ImportError:
    print("⚠️  Dépendances manquantes. Installez-les avec:")
    print("   pip install cairosvg pillow")
    exit(1)

# Tailles d'icônes requises pour PWA
SIZES = [72, 96, 128, 144, 152, 192, 384, 512]

def generate_icons():
    print("🎨 Génération des icônes PWA...\n")
    
    # Chemin du fichier SVG source
    svg_path = os.path.join(os.path.dirname(__file__), 'public', 'icon.svg')
    output_dir = os.path.join(os.path.dirname(__file__), 'public')
    
    if not os.path.exists(svg_path):
        print(f"❌ Fichier SVG introuvable: {svg_path}")
        return
    
    # Lire le contenu SVG
    with open(svg_path, 'r') as f:
        svg_content = f.read()
    
    for size in SIZES:
        output_path = os.path.join(output_dir, f'icon-{size}x{size}.png')
        
        try:
            # Convertir SVG en PNG
            png_data = cairosvg.svg2png(
                bytestring=svg_content.encode('utf-8'),
                output_width=size,
                output_height=size
            )
            
            # Sauvegarder le PNG
            with open(output_path, 'wb') as f:
                f.write(png_data)
            
            print(f"✅ Généré: icon-{size}x{size}.png")
            
        except Exception as e:
            print(f"❌ Erreur pour {size}x{size}: {e}")
    
    print("\n✨ Génération terminée !")

if __name__ == "__main__":
    generate_icons()
