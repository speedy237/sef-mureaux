#!/usr/bin/env node

/**
 * Génère les icônes PWA à partir d'une icône SVG
 * Nécessite: npm install sharp
 */

import sharp from 'sharp';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Icône SVG de base avec le logo SEF
const iconSVG = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <!-- Fond dégradé vert -->
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1c4a35;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#2d6b4f;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Rectangle de fond -->
  <rect width="512" height="512" fill="url(#bg)" rx="64"/>
  
  <!-- Icône panier/sac alimentaire stylisé -->
  <g transform="translate(256,256)">
    <!-- Panier -->
    <path d="M -100,-80 L -120,80 L 120,80 L 100,-80 Z" 
          fill="#f5f0e8" stroke="#fff" stroke-width="8" stroke-linejoin="round"/>
    
    <!-- Poignées -->
    <path d="M -80,-80 Q -80,-140 0,-140 Q 80,-140 80,-80" 
          fill="none" stroke="#fff" stroke-width="12" stroke-linecap="round"/>
    
    <!-- Feuille décorative (symbole de fraîcheur) -->
    <ellipse cx="0" cy="-20" rx="50" ry="30" fill="#d4870a" opacity="0.9"/>
    <path d="M 0,-50 Q 15,-20 0,10" fill="none" stroke="#1c4a35" stroke-width="4"/>
  </g>
</svg>
`;

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

async function generateIcons() {
  console.log('🎨 Génération des icônes PWA...\n');
  
  const publicDir = join(__dirname, 'public');
  const svgBuffer = Buffer.from(iconSVG);
  
  for (const size of sizes) {
    const outputPath = join(publicDir, `icon-${size}x${size}.png`);
    
    try {
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      
      console.log(`✅ Généré: icon-${size}x${size}.png`);
    } catch (error) {
      console.error(`❌ Erreur pour ${size}x${size}:`, error.message);
    }
  }
  
  console.log('\n✨ Génération terminée !');
}

generateIcons().catch(console.error);
