import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Calculator, Clock, Calendar, Euro, TrendingUp } from 'lucide-react'
import './App.css'

function App() {
  console.log("🚀 App component loaded!")
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [arbeitszeiten, setArbeitszeiten] = useState({})
  const [berechnungsErgebnis, setBerechnungsErgebnis] = useState(null)
  const [showDetails, setShowDetails] = useState(false)
  const [entgeltgruppe, setEntgeltgruppe] = useState('E5')
  const [steuerklasse, setSteuerklasse] = useState(1)

  // IG Metall Hessen 2025 Entgeltgruppen (Grundstufe)
  const entgeltgruppenTabelle = {
    'E5': 3189.00,
    'E6': 3508.00,
    'E7': 3891.00,
    'E8': 4369.00,
    'E9': 4943.00,
    'E10': 5421.00,
    'E11': 5900.00
  }

  // Aktuelles Bruttogehalt basierend auf Entgeltgruppe
  const bruttoGehalt = entgeltgruppenTabelle[entgeltgruppe]

  // Grunddaten für IG Metall Hessen
  const grunddaten = {
    wochenstunden: 35,
    steuerklasse: steuerklasse,
    kinderfreibetrag: 0,
    kirchensteuer: false,
    krankenversicherung: 'gesetzlich',
    zusatzbeitrag: 1.3
  }

  // Berechne Stundenlohn
  const stundenlohn = (bruttoGehalt * 3) / (13 * grunddaten.wochenstunden)

  // Hilfsfunktion: Ist es ein Feiertag?
  const istFeiertag = (datum) => {
    // Vereinfachte Feiertage für Deutschland (Hessen)
    const feiertage = [
      '01-01', // Neujahr
      '05-01', // Tag der Arbeit
      '10-03', // Tag der Deutschen Einheit
      '12-25', // 1. Weihnachtstag
      '12-26'  // 2. Weihnachtstag
    ]
    const monatTag = `${String(datum.getMonth() + 1).padStart(2, '0')}-${String(datum.getDate()).padStart(2, '0')}`
    return feiertage.includes(monatTag)
  }

  // Hilfsfunktion: Wochentag ermitteln
  const getWochentag = (datum) => {
    const tage = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']
    return tage[datum.getDay()]
  }

  // Berechne Zuschläge für eine Arbeitsstunde nach IG Metall Hessen Tarif
  const berechneZuschlaege = (datum, stunde, istÜberstunde = false, überstundenAnzahl = 0) => {
    const wochentag = datum.getDay() // 0 = Sonntag, 1 = Montag, ..., 6 = Samstag
    const istNacht = stunde >= 20 || stunde < 6 // Nachtarbeit 20:00-6:00 Uhr laut IG Metall
    const istSpätschicht = stunde >= 14 && stunde < 20 // Spätschicht 14:00-20:00 Uhr
    
    let zuschlaege = {
      überstunden: 0,
      nacht: 0,
      samstag: 0,
      sonntag: 0,
      feiertag: 0,
      spätschicht: 0
    }

    // Samstagsarbeit (wie gewünscht 50% beibehalten)
    if (wochentag === 6) {
      zuschlaege.samstag = 50
    }

    // Sonntagsarbeit (70% laut IG Metall Hessen)
    if (wochentag === 0) {
      zuschlaege.sonntag = 70
    }

    // Feiertagsarbeit (100% für arbeitsfreie Tage laut IG Metall Hessen)
    if (istFeiertag(datum)) {
      zuschlaege.feiertag = 100
    }

    // Nachtarbeit (20:00-6:00 Uhr) - 25% laut IG Metall Hessen Dokument
    if (istNacht) {
      zuschlaege.nacht = 25
    }

    // Spätschicht (14:00-20:00 Uhr) - 10% laut IG Metall Hessen
    if (istSpätschicht && !istNacht) {
      zuschlaege.spätschicht = 10
    }

    // Überstundenzuschlag nur bei echten Überstunden an Werktagen - gestaffelt
    if (istÜberstunde && wochentag >= 1 && wochentag <= 5) {
      if (überstundenAnzahl <= 6) {
        zuschlaege.überstunden = 25 // 1.-6. Std./Woche
      } else if (überstundenAnzahl <= 8) {
        zuschlaege.überstunden = 40 // 7.+8. Std./Woche
      } else {
        zuschlaege.überstunden = 50 // ab 9. Std./Woche
      }
    }

    return zuschlaege
  }

  // Pausenzeiten (täglich): 09:00-09:15 (15min) + 12:00-12:30 (30min) = 45min = 0.75h
  const täglichePausenzeit = 0.75

  // Hilfsfunktion: Prüfe ob eine Stunde in der Pausenzeit liegt
  const istPausenzeit = (stunde) => {
    // 09:00-09:15 (15min) und 12:00-12:30 (30min) Pausenzeiten
    return (stunde === 9) || (stunde === 12)
  }

  // Hauptberechnungsfunktion
  const berechneGehalt = () => {
    let gesamtStunden = 0
    let gesamtPausenzeit = 0
    let zuschlagsSumme = 0
    let stundenDetails = []
    let alleArbeitsStunden = [] // Sammle alle Arbeitsstunden für korrekte Überstunden-Berechnung
    
    // Detaillierte Zuschlagsaufschlüsselung
    let zuschlagsDetails = {
      nacht: 0,
      samstag: 0,
      sonntag: 0,
      feiertag: 0,
      spätschicht: 0,
      überstunden: 0
    }

    // Erst alle Arbeitsstunden sammeln und Pausenzeiten abziehen
    Object.entries(arbeitszeiten).forEach(([tag, zeiten]) => {
      if (zeiten.von && zeiten.bis) {
        const datum = new Date(selectedYear, selectedMonth, parseInt(tag))
        console.log(`DEBUG: Tag ${tag}, Datum: ${datum}, Wochentag: ${datum.getDay()}, Von: ${zeiten.von}, Bis: ${zeiten.bis}`)
        const vonStunde = parseInt(zeiten.von.split(':')[0])
        const bisStunde = parseInt(zeiten.bis.split(':')[0])
        const vonMinute = parseInt(zeiten.von.split(':')[1])
        const bisMinute = parseInt(zeiten.bis.split(':')[1])
        
        const bruttoStunden = (bisStunde + bisMinute/60) - (vonStunde + vonMinute/60)
        
        // Prüfe ob Pausenzeiten in diesem Arbeitstag liegen
        let pausenAbzug = 0
        if (vonStunde <= 9 && bisStunde > 9) pausenAbzug += 0.25 // 15min Pause um 9:00
        if (vonStunde <= 12 && bisStunde > 12) pausenAbzug += 0.5 // 30min Pause um 12:00
        
        const nettoStunden = Math.max(0, bruttoStunden - pausenAbzug)
        gesamtStunden += nettoStunden
        gesamtPausenzeit += pausenAbzug

        // Sammle alle Arbeitsstunden für Überstunden-Berechnung
        for (let stunde = vonStunde; stunde < bisStunde; stunde++) {
          if (!istPausenzeit(stunde)) {
            alleArbeitsStunden.push({
              datum,
              stunde,
              tag: parseInt(tag)
            })
          }
        }
      }
    })

    // Sortiere alle Arbeitsstunden chronologisch (wichtig für korrekte Überstunden-Berechnung)
    alleArbeitsStunden.sort((a, b) => {
      if (a.tag !== b.tag) return a.tag - b.tag
      return a.stunde - b.stunde
    })

    // Berechne Überstunden (alles über 35h/Woche * 4 Wochen)
    const sollStunden = grunddaten.wochenstunden * 4
    const überstunden = Math.max(0, gesamtStunden - sollStunden)

    // Markiere die letzten X Stunden als Überstunden
    const überstundenAnzahl = Math.floor(überstunden)
    for (let i = alleArbeitsStunden.length - überstundenAnzahl; i < alleArbeitsStunden.length; i++) {
      if (alleArbeitsStunden[i]) {
        alleArbeitsStunden[i].istÜberstunde = true
      }
    }

    // Jetzt berechne Zuschläge für alle Arbeitsstunden
    let aktuelleÜberstundenAnzahl = 0
    alleArbeitsStunden.forEach(({ datum, stunde, istÜberstunde = false }) => {
      if (istÜberstunde) aktuelleÜberstundenAnzahl++
      
      const zuschlaege = berechneZuschlaege(datum, stunde, istÜberstunde, aktuelleÜberstundenAnzahl)
      console.log(`DEBUG: Stunde ${stunde}, Wochentag: ${datum.getDay()}, Zuschläge:`, zuschlaege)
      // Zuschläge: Höchster anwendbarer Zuschlag gilt (nicht additiv)
      const gesamtZuschlag = Math.max(
        zuschlaege.überstunden,
        zuschlaege.nacht,
        zuschlaege.samstag,
        zuschlaege.sonntag,
        zuschlaege.feiertag,
        zuschlaege.spätschicht
      )
      console.log(`DEBUG: Gesamtzuschlag für Stunde ${stunde}: ${gesamtZuschlag}%`)
      
      const stundenlohnMitZuschlag = stundenlohn * (1 + gesamtZuschlag / 100)
      const zuschlagBetrag = stundenlohn * (gesamtZuschlag / 100)
      zuschlagsSumme += zuschlagBetrag
      
      // Sammle detaillierte Zuschlagsinformationen
      if (zuschlaege.nacht > 0) zuschlagsDetails.nacht += stundenlohn * (zuschlaege.nacht / 100)
      if (zuschlaege.samstag > 0) zuschlagsDetails.samstag += stundenlohn * (zuschlaege.samstag / 100)
      if (zuschlaege.sonntag > 0) zuschlagsDetails.sonntag += stundenlohn * (zuschlaege.sonntag / 100)
      if (zuschlaege.feiertag > 0) zuschlagsDetails.feiertag += stundenlohn * (zuschlaege.feiertag / 100)
      if (zuschlaege.spätschicht > 0) zuschlagsDetails.spätschicht += stundenlohn * (zuschlaege.spätschicht / 100)
      if (zuschlaege.überstunden > 0) zuschlagsDetails.überstunden += stundenlohn * (zuschlaege.überstunden / 100)
      
      stundenDetails.push({
        datum: datum.toLocaleDateString('de-DE'),
        wochentag: getWochentag(datum),
        stunde: `${stunde}:00-${stunde+1}:00`,
        zuschlag: gesamtZuschlag,
        betrag: stundenlohnMitZuschlag,
        zuschlagBetrag: zuschlagBetrag,
        istÜberstunde: istÜberstunde || false
      })
    })

    // Brutto-Berechnung
    const grundlohn = gesamtStunden * stundenlohn
    const bruttoGesamt = bruttoGehalt + zuschlagsSumme

    // Detaillierte Steuer- und Abgabenberechnung
    const rentenversicherung = bruttoGesamt * 0.093 // 9,3%
    const arbeitslosenversicherung = bruttoGesamt * 0.013 // 1,3%
    const krankenversicherung = bruttoGesamt * 0.073 // 7,3%
    const pflegeversicherung = bruttoGesamt * 0.01525 // 1,525%
    const sozialversicherungGesamt = rentenversicherung + arbeitslosenversicherung + krankenversicherung + pflegeversicherung
    
    // Lohnsteuerberechnung nach Steuerklasse
    const steuerklassenFreibeträge = {
      1: 1200,  // Steuerklasse I
      2: 1400,  // Steuerklasse II (Alleinerziehende)
      3: 1800,  // Steuerklasse III (verheiratet, Alleinverdiener)
      4: 1200,  // Steuerklasse IV (verheiratet, beide berufstätig)
      5: 400,   // Steuerklasse V (verheiratet, Zweitverdiener)
      6: 400    // Steuerklasse VI (Nebenjob)
    }
    
    const steuerklassenSätze = {
      1: 0.25,  // 25%
      2: 0.23,  // 23%
      3: 0.20,  // 20%
      4: 0.25,  // 25%
      5: 0.35,  // 35%
      6: 0.40   // 40%
    }
    
    const steuerfreibetrag = steuerklassenFreibeträge[steuerklasse] || 1200
    const steuersatz = steuerklassenSätze[steuerklasse] || 0.25
    const zu_versteuerndes_einkommen = Math.max(0, bruttoGesamt - steuerfreibetrag)
    const lohnsteuer = zu_versteuerndes_einkommen * steuersatz
    // Kein Solidaritätszuschlag
    
    const gesamtAbzüge = sozialversicherungGesamt + lohnsteuer
    const nettoGehalt = bruttoGesamt - gesamtAbzüge

    setBerechnungsErgebnis({
      gesamtStunden,
      überstunden,
      grundlohn,
      zuschlagsSumme,
      bruttoGesamt,
      nettoGehalt,
      stundenDetails,
      gesamtPausenzeit,
      effizienz: überstunden > 0 ? (nettoGehalt - 2250) / überstunden : 0,
      // Detaillierte Aufschlüsselung
      zuschlagsDetails,
      abzügeDetails: {
        rentenversicherung,
        arbeitslosenversicherung,
        krankenversicherung,
        pflegeversicherung,
        sozialversicherungGesamt,
        lohnsteuer,
        gesamtAbzüge,
        steuerfreibetrag,
        steuersatz
      }
    })
  }

  // Automatische Neuberechnung bei Änderungen
  useEffect(() => {
    berechneGehalt()
  }, [arbeitszeiten, entgeltgruppe, steuerklasse, selectedMonth, selectedYear])

  // Hilfsfunktion: Arbeitszeit für einen Tag setzen
  const setArbeitszeit = (tag, feld, wert) => {
    console.log(`🔧 setArbeitszeit called: Tag ${tag}, Feld ${feld}, Wert ${wert}`)
    setArbeitszeiten(prev => ({
      ...prev,
      [tag]: {
        ...prev[tag],
        [feld]: wert
      }
    }))
  }

  // Funktion: Standard-Arbeitszeiten für Werktage setzen
  const setStandardArbeitszeiten = () => {
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate()
    const neueArbeitszeiten = { ...arbeitszeiten }
    
    for (let tag = 1; tag <= daysInMonth; tag++) {
      const datum = new Date(selectedYear, selectedMonth, tag)
      const wochentag = datum.getDay() // 0 = Sonntag, 1 = Montag, ..., 6 = Samstag
      
      // Nur für Werktage (Montag bis Freitag)
      if (wochentag >= 1 && wochentag <= 5) {
        neueArbeitszeiten[tag] = {
          von: '06:00',
          bis: '14:00'
        }
      }
    }
    
    setArbeitszeiten(neueArbeitszeiten)
  }

  // Funktion: Alle Arbeitszeiten löschen
  const clearArbeitszeiten = () => {
    setArbeitszeiten({})
  }

  // Generiere Kalendertage für den ausgewählten Monat
  const generateKalenderTage = () => {
    const tage = []
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate()
    
    for (let tag = 1; tag <= daysInMonth; tag++) {
      const datum = new Date(selectedYear, selectedMonth, tag)
      const wochentag = getWochentag(datum)
      const istWochenende = datum.getDay() === 0 || datum.getDay() === 6
      
      tage.push(
        <div key={tag} className={`p-3 border rounded-lg ${istWochenende ? 'bg-blue-50' : 'bg-white'}`}>
          <div className="flex justify-between items-center mb-2">
            <span className="font-medium">{tag}</span>
            <Badge variant={istWochenende ? 'secondary' : 'outline'} className="text-xs">
              {wochentag.slice(0, 2)}
            </Badge>
          </div>
          
          <div className="space-y-2">
            <div className="flex space-x-1">
              <Input
                type="time"
                placeholder="Von"
                value={arbeitszeiten[tag]?.von || ''}
                onChange={(e) => setArbeitszeit(tag, 'von', e.target.value)}
                className="text-xs h-8"
              />
              <Input
                type="time"
                placeholder="Bis"
                value={arbeitszeiten[tag]?.bis || ''}
                onChange={(e) => setArbeitszeit(tag, 'bis', e.target.value)}
                className="text-xs h-8"
              />
            </div>
          </div>
        </div>
      )
    }
    return tage
  }

  const monate = [
    'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-gray-900 flex items-center justify-center gap-3">
            <Calculator className="text-blue-600" />
            IG Metall Hessen - Gehaltsrechner
          </h1>
          <p className="text-lg text-gray-600">Entgeltgruppe E5 • Optimieren Sie Ihr Netto-Gehalt durch intelligente Arbeitszeit-Planung</p>
        </div>

        {/* Eingabebereich */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Grunddaten */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Euro className="h-5 w-5" />
                Grunddaten
              </CardTitle>
              <CardDescription>Ihre Basis-Gehaltsdaten (IG Metall Hessen 2025)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Entgeltgruppe</label>
                <select
                  value={entgeltgruppe}
                  onChange={(e) => setEntgeltgruppe(e.target.value)}
                  className="w-full mt-1 p-2 border rounded-md"
                >
                  <option value="E5">E5 - {entgeltgruppenTabelle.E5.toFixed(2)} €</option>
                  <option value="E6">E6 - {entgeltgruppenTabelle.E6.toFixed(2)} €</option>
                  <option value="E7">E7 - {entgeltgruppenTabelle.E7.toFixed(2)} €</option>
                  <option value="E8">E8 - {entgeltgruppenTabelle.E8.toFixed(2)} €</option>
                  <option value="E9">E9 - {entgeltgruppenTabelle.E9.toFixed(2)} €</option>
                  <option value="E10">E10 - {entgeltgruppenTabelle.E10.toFixed(2)} €</option>
                  <option value="E11">E11 - {entgeltgruppenTabelle.E11.toFixed(2)} €</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Steuerklasse</label>
                <select
                  value={steuerklasse}
                  onChange={(e) => setSteuerklasse(Number(e.target.value))}
                  className="w-full mt-1 p-2 border rounded-md"
                >
                  <option value={1}>I - Ledig/Geschieden</option>
                  <option value={2}>II - Alleinerziehend</option>
                  <option value={3}>III - Verheiratet (Alleinverdiener)</option>
                  <option value={4}>IV - Verheiratet (beide berufstätig)</option>
                  <option value={5}>V - Verheiratet (Zweitverdiener)</option>
                  <option value={6}>VI - Nebenjob</option>
                </select>
              </div>
              <div className="text-sm text-gray-600 space-y-1 border-t pt-3">
                <p><strong>Brutto-Gehalt:</strong> {bruttoGehalt.toFixed(2)} €</p>
                <p><strong>Stundenlohn:</strong> {stundenlohn.toFixed(2)} €</p>
                <p><strong>Wochenstunden:</strong> {grunddaten.wochenstunden}</p>
                <p><strong>Steuerklasse:</strong> {grunddaten.steuerklasse}</p>
              </div>
            </CardContent>
          </Card>

          {/* Monat auswählen */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Zeitraum
              </CardTitle>
              <CardDescription>Wählen Sie den Berechnungsmonat</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Monat</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="w-full mt-1 p-2 border rounded-md"
                >
                  {monate.map((monat, index) => (
                    <option key={index} value={index}>{monat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Jahr</label>
                <Input
                  type="number"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          {/* Ergebnis-Übersicht */}
          {berechnungsErgebnis && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Ergebnis
                </CardTitle>
                <CardDescription>Ihr optimiertes Gehalt</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span>Grundgehalt:</span>
                    <span className="font-medium">{bruttoGehalt.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Zuschläge:</span>
                    <span className="font-medium text-green-600">+{berechnungsErgebnis.zuschlagsSumme.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span>Brutto gesamt:</span>
                    <span className="font-bold">{berechnungsErgebnis.bruttoGesamt.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Netto ca.:</span>
                    <span className="font-bold text-green-600">{berechnungsErgebnis.nettoGehalt.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Überstunden:</span>
                    <span>{berechnungsErgebnis.überstunden.toFixed(1)} h</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Pausenzeit:</span>
                    <span>{berechnungsErgebnis.gesamtPausenzeit.toFixed(1)} h</span>
                  </div>
                  {berechnungsErgebnis.effizienz > 0 && (
                    <div className="flex justify-between text-xs text-blue-600">
                      <span>Effizienz:</span>
                      <span>{berechnungsErgebnis.effizienz.toFixed(2)} €/h</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Detaillierte Berechnung */}
        {berechnungsErgebnis && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Detaillierte Berechnung
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowDetails(!showDetails)}
                >
                  {showDetails ? 'Ausblenden' : 'Details anzeigen'}
                </Button>
              </CardTitle>
              <CardDescription>
                Vollständige Aufschlüsselung aller Zuschläge und Abzüge
              </CardDescription>
            </CardHeader>
            {showDetails && (
              <CardContent className="space-y-6">
                {/* Zuschläge-Details */}
                <div>
                  <h4 className="font-semibold mb-3 text-green-700">Zuschläge-Aufschlüsselung</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {berechnungsErgebnis.zuschlagsDetails.nacht > 0 && (
                      <div className="flex justify-between">
                        <span>Nachtzuschlag (25%):</span>
                        <span className="font-medium">+{berechnungsErgebnis.zuschlagsDetails.nacht.toFixed(2)} €</span>
                      </div>
                    )}
                    {berechnungsErgebnis.zuschlagsDetails.samstag > 0 && (
                      <div className="flex justify-between">
                        <span>Samstagszuschlag (50%):</span>
                        <span className="font-medium">+{berechnungsErgebnis.zuschlagsDetails.samstag.toFixed(2)} €</span>
                      </div>
                    )}
                    {berechnungsErgebnis.zuschlagsDetails.sonntag > 0 && (
                      <div className="flex justify-between">
                        <span>Sonntagszuschlag (100%):</span>
                        <span className="font-medium">+{berechnungsErgebnis.zuschlagsDetails.sonntag.toFixed(2)} €</span>
                      </div>
                    )}
                    {berechnungsErgebnis.zuschlagsDetails.feiertag > 0 && (
                      <div className="flex justify-between">
                        <span>Feiertagszuschlag (150%):</span>
                        <span className="font-medium">+{berechnungsErgebnis.zuschlagsDetails.feiertag.toFixed(2)} €</span>
                      </div>
                    )}
                    {berechnungsErgebnis.zuschlagsDetails.spätschicht > 0 && (
                      <div className="flex justify-between">
                        <span>Spätschichtzuschlag (15%):</span>
                        <span className="font-medium">+{berechnungsErgebnis.zuschlagsDetails.spätschicht.toFixed(2)} €</span>
                      </div>
                    )}
                    {berechnungsErgebnis.zuschlagsDetails.überstunden > 0 && (
                      <div className="flex justify-between">
                        <span>Überstundenzuschlag (25%):</span>
                        <span className="font-medium">+{berechnungsErgebnis.zuschlagsDetails.überstunden.toFixed(2)} €</span>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between border-t pt-2 mt-3 font-semibold text-green-700">
                    <span>Zuschläge gesamt:</span>
                    <span>+{berechnungsErgebnis.zuschlagsSumme.toFixed(2)} €</span>
                  </div>
                </div>

                {/* Abzüge-Details */}
                <div>
                  <h4 className="font-semibold mb-3 text-red-700">Abzüge-Aufschlüsselung</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex justify-between">
                      <span>Rentenversicherung (9,3%):</span>
                      <span className="font-medium">-{berechnungsErgebnis.abzügeDetails.rentenversicherung.toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Arbeitslosenversicherung (1,3%):</span>
                      <span className="font-medium">-{berechnungsErgebnis.abzügeDetails.arbeitslosenversicherung.toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Krankenversicherung (7,3%):</span>
                      <span className="font-medium">-{berechnungsErgebnis.abzügeDetails.krankenversicherung.toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Pflegeversicherung (1,525%):</span>
                      <span className="font-medium">-{berechnungsErgebnis.abzügeDetails.pflegeversicherung.toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Lohnsteuer (Steuerklasse {steuerklasse}):</span>
                      <span className="font-medium">-{berechnungsErgebnis.abzügeDetails.lohnsteuer.toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Steuerfreibetrag: {berechnungsErgebnis.abzügeDetails.steuerfreibetrag.toFixed(2)} €</span>
                      <span>Steuersatz: {(berechnungsErgebnis.abzügeDetails.steuersatz * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="flex justify-between border-t pt-2 mt-3 font-semibold text-red-700">
                    <span>Abzüge gesamt:</span>
                    <span>-{berechnungsErgebnis.abzügeDetails.gesamtAbzüge.toFixed(2)} €</span>
                  </div>
                </div>

                {/* Zusammenfassung */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-3">Zusammenfassung</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Grundgehalt:</span>
                      <span>{bruttoGehalt.toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between text-green-600">
                      <span>+ Zuschläge:</span>
                      <span>+{berechnungsErgebnis.zuschlagsSumme.toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between font-medium border-t pt-2">
                      <span>= Brutto gesamt:</span>
                      <span>{berechnungsErgebnis.bruttoGesamt.toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between text-red-600">
                      <span>- Abzüge:</span>
                      <span>-{berechnungsErgebnis.abzügeDetails.gesamtAbzüge.toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg border-t pt-2 text-green-700">
                      <span>= Netto-Gehalt:</span>
                      <span>{berechnungsErgebnis.nettoGehalt.toFixed(2)} €</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        )}

        {/* Kalender */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Arbeitszeiten - {monate[selectedMonth]} {selectedYear}
            </CardTitle>
            <CardDescription>
              Tragen Sie Ihre Arbeitszeiten ein. Zuschläge werden automatisch berechnet.
            </CardDescription>
            <div className="flex gap-2 mt-4">
              <Button 
                onClick={setStandardArbeitszeiten}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Clock className="h-4 w-4" />
                Standard-Zeiten (Mo-Fr 06:00-14:00)
              </Button>
              <Button 
                onClick={clearArbeitszeiten}
                variant="outline"
                className="flex items-center gap-2 text-red-600 hover:text-red-700"
              >
                <Calendar className="h-4 w-4" />
                Alle löschen
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-3">
              {generateKalenderTage()}
            </div>
          </CardContent>
        </Card>

        {/* Detailanalyse */}
        {berechnungsErgebnis && berechnungsErgebnis.stundenDetails.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Detailanalyse der Zuschläge</CardTitle>
              <CardDescription>Aufschlüsselung aller Arbeitsstunden mit Zuschlägen</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Datum</th>
                      <th className="text-left p-2">Wochentag</th>
                      <th className="text-left p-2">Uhrzeit</th>
                      <th className="text-right p-2">Zuschlag</th>
                      <th className="text-right p-2">Stundenlohn</th>
                    </tr>
                  </thead>
                  <tbody>
                    {berechnungsErgebnis.stundenDetails.slice(0, 20).map((detail, index) => (
                      <tr key={index} className="border-b">
                        <td className="p-2">{detail.datum}</td>
                        <td className="p-2">{detail.wochentag}</td>
                        <td className="p-2">{detail.stunde}</td>
                        <td className="p-2 text-right">
                          <Badge variant={detail.zuschlag > 50 ? 'default' : 'secondary'}>
                            +{detail.zuschlag}%
                          </Badge>
                        </td>
                        <td className="p-2 text-right font-medium">{detail.betrag.toFixed(2)} €</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {berechnungsErgebnis.stundenDetails.length > 20 && (
                  <p className="text-sm text-gray-500 mt-2">
                    ... und {berechnungsErgebnis.stundenDetails.length - 20} weitere Stunden
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default App
