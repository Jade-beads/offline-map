const fs = require('fs')
const path = require('path')

const outputDir = path.join(__dirname, '..', 'public', 'bank-icons')

const banks = [
  { id: 'boc', name: '中国银行', shortName: '中', code: 'BOC', color: '#B6002A', accent: '#d21f3e', type: 'target', logoSource: 'https://commons.wikimedia.org/wiki/File:Bank_of_China_symbol.svg' },
  { id: 'icbc', name: '工商银行', shortName: '工', code: 'ICBC', color: '#C7000B', accent: '#E33A3A', type: 'competitor', logoSource: 'https://commons.wikimedia.org/wiki/File:ICBC_China_logo.svg' },
  { id: 'ccb', name: '建设银行', shortName: '建', code: 'CCB', color: '#005BAC', accent: '#2078D4', type: 'competitor', logoSource: 'https://commons.wikimedia.org/wiki/File:People_Construction_Bank_of_China_logo.svg' },
  { id: 'abc', name: '农业银行', shortName: '农', code: 'ABC', color: '#008566', accent: '#13A886', type: 'competitor', logoSource: 'https://en.wikipedia.org/wiki/Agricultural_Bank_of_China' },
  { id: 'cdb', name: '国家开发银行', shortName: '开', code: 'CDB', color: '#004B8D', accent: '#2D74B8', type: 'policy', logoSource: 'https://commons.wikimedia.org/wiki/File:PRC_China_Development_Bank_(CDB)_logo.svg' },
  { id: 'adbc', name: '中国农业发展银行', shortName: '农发', code: 'ADBC', color: '#006B3F', accent: '#2CA66A', type: 'policy', logoSource: null },
  { id: 'bocom', name: '交通银行', shortName: '交', code: 'BOCOM', color: '#003B7A', accent: '#1F6BC1', type: 'competitor', logoSource: 'https://commons.wikimedia.org/wiki/File:Bank_of_Communications_Logo.svg' },
  { id: 'cmb', name: '招商银行', shortName: '招', code: 'CMB', color: '#E60012', accent: '#F05A5A', type: 'competitor', logoSource: 'https://commons.wikimedia.org/wiki/File:China_Merchants_Bank_logo.jpg' },
  { id: 'psbc', name: '邮储银行', shortName: '邮', code: 'PSBC', color: '#007A3D', accent: '#20A464', type: 'competitor', logoSource: 'https://commons.wikimedia.org/wiki/File:Postal_Savings_Bank_of_China_-_text_logo.svg' },
  { id: 'cmbc', name: '民生银行', shortName: '民', code: 'CMBC', color: '#008C8C', accent: '#22B8B8', type: 'competitor', logoSource: 'https://commons.wikimedia.org/wiki/File:China_Minsheng_Bank_logo.svg' },
  { id: 'cib', name: '兴业银行', shortName: '兴', code: 'CIB', color: '#004A98', accent: '#1D6FD1', type: 'competitor' },
  { id: 'spdb', name: '浦发银行', shortName: '浦', code: 'SPDB', color: '#123C7C', accent: '#3B67B0', type: 'competitor' },
  { id: 'citic', name: '中信银行', shortName: '信', code: 'CITIC', color: '#C8102E', accent: '#E7445E', type: 'competitor' },
  { id: 'ceb', name: '光大银行', shortName: '光', code: 'CEB', color: '#6B2FA0', accent: '#9662C8', type: 'competitor', logoSource: 'https://en.wikipedia.org/wiki/China_Everbright_Bank' }
]

function markerSvg(bank, selected = false) {
  const width = selected ? 76 : 56
  const height = selected ? 84 : 64
  const cx = width / 2
  const labelFontSize = bank.shortName.length > 1 ? 13 : 17
  const halo = selected
    ? `<circle cx="${cx}" cy="34" r="32" fill="${bank.accent}" opacity=".14"/>
       <circle cx="${cx}" cy="34" r="24" fill="${bank.accent}" opacity=".18"/>`
    : ''

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${bank.name}地图点位">
  <defs>
    <filter id="shadow" x="-35%" y="-25%" width="170%" height="170%">
      <feDropShadow dx="0" dy="5" stdDeviation="4" flood-color="#17202B" flood-opacity=".22"/>
    </filter>
    <linearGradient id="brand" x1="18" y1="8" x2="42" y2="48" gradientUnits="userSpaceOnUse">
      <stop stop-color="${bank.accent}"/>
      <stop offset="1" stop-color="${bank.color}"/>
    </linearGradient>
  </defs>
  ${halo}
  <ellipse cx="${cx}" cy="${selected ? 68 : 52}" rx="${selected ? 18 : 15}" ry="5" fill="#17202B" opacity=".16"/>
  <path filter="url(#shadow)" d="M${cx} 4c-13.6 0-24.6 10.7-24.6 23.9 0 17.4 20.8 31.9 23.2 33.5.8.5 2 .5 2.8 0 2.4-1.6 23.2-16.1 23.2-33.5C${cx + 24.6} 14.7 ${cx + 13.6} 4 ${cx} 4Z" fill="url(#brand)" stroke="#FFFFFF" stroke-width="3"/>
  <circle cx="${cx}" cy="28" r="16" fill="#FFFFFF"/>
  <circle cx="${cx}" cy="28" r="13" fill="${bank.color}" opacity=".08"/>
  <text x="${cx}" y="33.5" text-anchor="middle" font-family="Arial, 'Microsoft YaHei', sans-serif" font-size="${labelFontSize}" font-weight="700" fill="${bank.color}">${bank.shortName}</text>
</svg>
`
}

function officialMarkerSvg(bank, logoSvg, selected = false) {
  const width = selected ? 76 : 56
  const height = selected ? 84 : 64
  const cx = width / 2
  const logoDataUri = `data:image/svg+xml;base64,${Buffer.from(logoSvg).toString('base64')}`
  const halo = selected
    ? `<circle cx="${cx}" cy="34" r="32" fill="${bank.accent}" opacity=".14"/>
       <circle cx="${cx}" cy="34" r="24" fill="${bank.accent}" opacity=".18"/>`
    : ''

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${bank.name}官方logo地图点位">
  <defs>
    <filter id="shadow" x="-35%" y="-25%" width="170%" height="170%">
      <feDropShadow dx="0" dy="5" stdDeviation="4" flood-color="#17202B" flood-opacity=".22"/>
    </filter>
    <linearGradient id="brand" x1="18" y1="8" x2="42" y2="48" gradientUnits="userSpaceOnUse">
      <stop stop-color="${bank.accent}"/>
      <stop offset="1" stop-color="${bank.color}"/>
    </linearGradient>
    <clipPath id="logoClip">
      <circle cx="${cx}" cy="28" r="16"/>
    </clipPath>
  </defs>
  ${halo}
  <ellipse cx="${cx}" cy="${selected ? 68 : 52}" rx="${selected ? 18 : 15}" ry="5" fill="#17202B" opacity=".16"/>
  <path filter="url(#shadow)" d="M${cx} 4c-13.6 0-24.6 10.7-24.6 23.9 0 17.4 20.8 31.9 23.2 33.5.8.5 2 .5 2.8 0 2.4-1.6 23.2-16.1 23.2-33.5C${cx + 24.6} 14.7 ${cx + 13.6} 4 ${cx} 4Z" fill="url(#brand)" stroke="#FFFFFF" stroke-width="3"/>
  <circle cx="${cx}" cy="28" r="16" fill="#FFFFFF"/>
  <image href="${logoDataUri}" x="${cx - 13}" y="15" width="26" height="26" preserveAspectRatio="xMidYMid meet" clip-path="url(#logoClip)"/>
</svg>
`
}

function clusterSvg(bank, level) {
  const sizes = [48, 58, 70]
  const counts = [18, 58, 126]
  const size = sizes[level]
  const outer = size + 22
  const cx = outer / 2

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${outer}" height="${outer}" viewBox="0 0 ${outer} ${outer}" role="img" aria-label="${bank.name}聚合点位">
  <defs>
    <filter id="shadow" x="-30%" y="-20%" width="160%" height="160%">
      <feDropShadow dx="0" dy="5" stdDeviation="4" flood-color="#17202B" flood-opacity=".18"/>
    </filter>
  </defs>
  <circle cx="${cx}" cy="${cx}" r="${cx}" fill="${bank.accent}" opacity=".12"/>
  <circle cx="${cx}" cy="${cx}" r="${cx - 6}" fill="${bank.accent}" opacity=".22"/>
  <circle filter="url(#shadow)" cx="${cx}" cy="${cx}" r="${size / 2}" fill="${bank.color}" stroke="#FFFFFF" stroke-width="3"/>
  <text x="${cx}" y="${cx + 6}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${level === 2 ? 20 : 16}" font-weight="700" fill="#FFFFFF">${counts[level]}</text>
</svg>
`
}

function manifest() {
  return JSON.stringify({
    usage: {
      amapImageSize: [56, 64],
      selectedImageSize: [76, 84],
      clusterSizes: [[70, 70], [80, 80], [92, 92]],
      note: 'SVGs are map marker wrappers using brand colors and short bank labels. Replace the central label with authorized official logo artwork when final brand approval is required.'
    },
    banks: banks.map((bank) => ({
      id: bank.id,
      name: bank.name,
      code: bank.code,
      color: bank.color,
      accent: bank.accent,
      marker: `/bank-icons/${bank.id}.svg`,
      selectedMarker: `/bank-icons/${bank.id}-selected.svg`,
      officialMarker: fs.existsSync(path.join(outputDir, 'official', `${bank.id}.svg`)) ? `/bank-icons/${bank.id}-official.svg` : null,
      selectedOfficialMarker: fs.existsSync(path.join(outputDir, 'official', `${bank.id}.svg`)) ? `/bank-icons/${bank.id}-official-selected.svg` : null,
      cluster: `/bank-icons/${bank.id}-cluster-2.svg`,
      officialLogoSourceCandidate: bank.logoSource || null
    }))
  }, null, 2) + '\n'
}

fs.mkdirSync(outputDir, { recursive: true })
for (const bank of banks) {
  fs.writeFileSync(path.join(outputDir, `${bank.id}.svg`), markerSvg(bank), 'utf8')
  fs.writeFileSync(path.join(outputDir, `${bank.id}-selected.svg`), markerSvg(bank, true), 'utf8')
  const officialLogoPath = path.join(outputDir, 'official', `${bank.id}.svg`)
  if (fs.existsSync(officialLogoPath)) {
    const logoSvg = fs.readFileSync(officialLogoPath, 'utf8')
    fs.writeFileSync(path.join(outputDir, `${bank.id}-official.svg`), officialMarkerSvg(bank, logoSvg), 'utf8')
    fs.writeFileSync(path.join(outputDir, `${bank.id}-official-selected.svg`), officialMarkerSvg(bank, logoSvg, true), 'utf8')
  }
  for (let level = 0; level < 3; level += 1) {
    fs.writeFileSync(path.join(outputDir, `${bank.id}-cluster-${level + 1}.svg`), clusterSvg(bank, level), 'utf8')
  }
}
fs.writeFileSync(path.join(outputDir, 'manifest.json'), manifest(), 'utf8')

console.log(`Generated ${banks.length * 5 + 1} files in ${outputDir}`)
