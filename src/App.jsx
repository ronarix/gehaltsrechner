import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Calculator, Clock, Calendar, Euro, TrendingUp } from 'lucide-react'
import './App.css'

function App() {
  console.log("🚀 NEW App component loaded!")
  
  // State variables
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [arbeitszeiten, setArbeitszeiten] = useState({})
  const [berechnungsErgebnis, setBerechnungsErgebnis] = useState(null)
  const [showDetails, setShowDetails] = useState(false)
  const [entgeltgruppe, setEntgeltgruppe] = useState(0) // E5 = index 0
  const [steuerklasse, setSteuerklasse] = useState(0) // Klasse I = index 0

  // IG Metall Hessen 2025 Entgeltgruppen (korrekte Werte)
  const entgeltgruppen = [
    { name: 'E5', gehalt: 3189.00 },
    { name: 'E6', gehalt: 3508.00 },
    { name: 'E7', gehalt: 3891.00 },
    { name: 'E8', gehalt: 4369.00 },
    { name: 'E9', gehalt: 4943.00 },
    { name: 'E10', gehalt: 5421.00 },
    { name: 'E11', gehalt: 5900.00 }
  ]

  // Steuerklassen
  const steuerklassen = [
    { name: 'I - Ledig/Geschieden', freibetrag: 1200, steuersatz: 25 },
    { name: 'II - Alleinerziehend', freibetrag: 1500, steuersatz: 23 },
    { name: 'III - Verheiratet (Alleinverdiener)', freibetrag: 2400, steuersatz: 20 },
    { name: 'IV - Verheiratet (beide berufstätig)', freibetrag: 1200, steuersatz: 25 },
    { name: 'V - Verheiratet (Zweitverdiener)', freibetrag: 600, steuersatz: 35 },
    { name: 'VI - Nebenjob', freibetrag: 0, steuersatz: 40 }
  ]

  // Berechne Grunddaten
  const grundgehalt = entgeltgruppen[entgeltgruppe].gehalt
  const stundenlohn = grundgehalt / (35 * 4.33) // 35h/Woche, 4.33 Wochen/Monat

  // Wochentag bestimmen (0=Sonntag, 1=Montag, ..., 6=Samstag)
  const getWochentag = (datum) => {
    const wochentage = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']
    return wochentage[datum.getDay()]
  }

  // Zuschläge berechnen (korrekte IG Metall Hessen Regeln)
  const berechneZuschlaege = (datum, stunde, istÜberstunde, überstundenAnzahl) => {
    console.log(`🔍 berechneZuschlaege: Datum=${datum}, Stunde=${stunde}, istÜberstunde=${istÜberstunde}, überstundenAnzahl=${überstundenAnzahl}`)
    
    const wochentag = datum.getDay() // 0=Sonntag, 6=Samstag
    const zuschlaege = {
      überstunden: 0,
      nacht: 0,
      samstag: 0,
      sonntag: 0,
      feiertag: 0,
      spätschicht: 0
    }

    // Überstundenzuschläge (gestaffelt)
    if (istÜberstunde) {
      if (überstundenAnzahl <= 6) {
        zuschlaege.überstunden = 25
      } else if (überstundenAnzahl <= 8) {
        zuschlaege.überstunden = 40
      } else {
        zuschlaege.überstunden = 50
      }
    }

    // Nachtarbeit (20:00-06:00 Uhr)
    if (stunde >= 20 || stunde < 6) {
      zuschlaege.nacht = 25 // Vereinfacht: 25% für alle Nachtstunden
    }

    // Spätschicht (14:00-20:00 Uhr)
    if (stunde >= 14 && stunde < 20) {
      zuschlaege.spätschicht = 10
    }

    // Samstagsarbeit
    if (wochentag === 6) {
      zuschlaege.samstag = 50
    }

    // Sonntagsarbeit
    if (wochentag === 0) {
      zuschlaege.sonntag = 70
    }

    console.log(`📊 Berechnete Zuschläge:`, zuschlaege)
    return zuschlaege
  }

  // Hauptberechnungsfunktion
  const berechneGehalt = () => {
    console.log("💰 berechneGehalt started")
    console.log("📅 Arbeitszeiten:", arbeitszeiten)

    if (!arbeitszeiten || Object.keys(arbeitszeiten).length === 0) {
      console.log("⚠️ Keine Arbeitszeiten vorhanden")
      setBerechnungsErgebnis({
        grundgehalt,
        zuschlaege: 0,
        bruttoGesamt: grundgehalt,
        netto: grundgehalt * 0.65, // Vereinfachte Nettoberechnung
        überstunden: 0,
        pausenzeit: 0,
        details: {
          zuschlagsDetails: {},
          abzüge: {}
        }
      })
      return
    }

    let gesamtZuschläge = 0
    let gesamtÜberstunden = 0
    let gesamtPausenzeit = 0
    let alleArbeitsStunden = []

    // Sammle alle Arbeitsstunden
    Object.entries(arbeitszeiten).forEach(([tag, zeiten]) => {
      if (zeiten.von && zeiten.bis) {
        console.log(`📅 Verarbeite Tag ${tag}: ${zeiten.von}-${zeiten.bis}`)
        
        const datum = new Date(selectedYear, selectedMonth, parseInt(tag))
        const vonStunde = parseInt(zeiten.von.split(':')[0])
        const bisStunde = parseInt(zeiten.bis.split(':')[0])
        
        // Berechne Bruttostunden
        let bruttoStunden = bisStunde - vonStunde
        if (bruttoStunden < 0) bruttoStunden += 24 // Über Mitternacht
        
        // Pausenzeiten abziehen (09:00-09:15 und 12:00-12:30)
        let pausenzeit = 0
        for (let stunde = vonStunde; stunde < bisStunde; stunde++) {
          if (stunde === 9) pausenzeit += 0.25 // 15 Minuten
          if (stunde === 12) pausenzeit += 0.5 // 30 Minuten
        }
        
        const nettoStunden = bruttoStunden - pausenzeit
        gesamtPausenzeit += pausenzeit
        
        // Füge Stunden zur Liste hinzu
        for (let stunde = vonStunde; stunde < bisStunde; stunde++) {
          // Überspringe Pausenzeiten
          if ((stunde === 9 && stunde < 9.25) || (stunde >= 12 && stunde < 12.5)) {
            continue
          }
          
          alleArbeitsStunden.push({
            datum,
            stunde,
            tag: parseInt(tag)
          })
        }
      }
    })

    console.log(`📊 Gesammelte Arbeitsstunden: ${alleArbeitsStunden.length}`)

    // Berechne Überstunden (über 35h/Woche = 140h/Monat)
    const normalStunden = Math.min(alleArbeitsStunden.length, 140)
    gesamtÜberstunden = Math.max(0, alleArbeitsStunden.length - 140)

    // Berechne Zuschläge für jede Stunde
    let überstundenCounter = 0
    alleArbeitsStunden.forEach(({ datum, stunde }, index) => {
      const istÜberstunde = index >= normalStunden
      if (istÜberstunde) überstundenCounter++
      
      const zuschlaege = berechneZuschlaege(datum, stunde, istÜberstunde, überstundenCounter)
      
      // Höchster Zuschlag gilt (nicht additiv)
      const maxZuschlag = Math.max(
        zuschlaege.überstunden,
        zuschlaege.nacht,
        zuschlaege.samstag,
        zuschlaege.sonntag,
        zuschlaege.feiertag,
        zuschlaege.spätschicht
      )
      
      gesamtZuschläge += stundenlohn * (maxZuschlag / 100)
    })

    // Steuerberechnung
    const bruttoGesamt = grundgehalt + gesamtZuschläge
    const steuerklasseData = steuerklassen[steuerklasse]
    const steuerpflichtigesEinkommen = Math.max(0, bruttoGesamt - steuerklasseData.freibetrag)
    const lohnsteuer = steuerpflichtigesEinkommen * (steuerklasseData.steuersatz / 100)
    
    // Sozialversicherung
    const rentenversicherung = bruttoGesamt * 0.093
    const arbeitslosenversicherung = bruttoGesamt * 0.013
    const krankenversicherung = bruttoGesamt * 0.073
    const pflegeversicherung = bruttoGesamt * 0.01525
    
    const gesamtAbzüge = lohnsteuer + rentenversicherung + arbeitslosenversicherung + krankenversicherung + pflegeversicherung
    const netto = bruttoGesamt - gesamtAbzüge

    const ergebnis = {
      grundgehalt,
      zuschlaege: gesamtZuschläge,
      bruttoGesamt,
      netto,
      überstunden: gesamtÜberstunden,
      pausenzeit: gesamtPausenzeit,
      details: {
        zuschlagsDetails: { gesamtZuschläge },
        abzüge: {
          lohnsteuer,
          rentenversicherung,
          arbeitslosenversicherung,
          krankenversicherung,
          pflegeversicherung,
          gesamt: gesamtAbzüge
        }
      }
    }

    console.log("✅ Berechnungsergebnis:", ergebnis)
    setBerechnungsErgebnis(ergebnis)
  }

  // useEffect für automatische Neuberechnung
  useEffect(() => {
    console.log("🔄 useEffect triggered - recalculating...")
    berechneGehalt()
  }, [arbeitszeiten, entgeltgruppe, steuerklasse, selectedMonth, selectedYear])

  // Arbeitszeit setzen
  const setArbeitszeit = (tag, feld, wert) => {
    console.log(`🔧 setArbeitszeit: Tag ${tag}, Feld ${feld}, Wert ${wert}`)
    setArbeitszeiten(prev => ({
      ...prev,
      [tag]: {
        ...prev[tag],
        [feld]: wert
      }
    }))
  }

  // Standard-Arbeitszeiten setzen
  const setStandardArbeitszeiten = () => {
    console.log("⚡ Setting standard work times...")
    const neueZeiten = {}
    
    // Für jeden Tag im Monat prüfen
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate()
    for (let tag = 1; tag <= daysInMonth; tag++) {
      const datum = new Date(selectedYear, selectedMonth, tag)
      const wochentag = datum.getDay()
      
      // Nur Werktage (Mo-Fr = 1-5)
      if (wochentag >= 1 && wochentag <= 5) {
        neueZeiten[tag] = {
          von: '06:00',
          bis: '14:00'
        }
      }
    }
    
    setArbeitszeiten(neueZeiten)
  }

  // Alle Zeiten löschen
  const alleZeitenLöschen = () => {
    console.log("🗑️ Clearing all times...")
    setArbeitszeiten({})
  }

  // Kalender rendern
  const renderKalender = () => {
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate()
    const kalenderTage = []

    for (let tag = 1; tag <= daysInMonth; tag++) {
      const datum = new Date(selectedYear, selectedMonth, tag)
      const wochentag = datum.getDay()
      const wochentagName = getWochentag(datum).substring(0, 2)
      const istWochenende = wochentag === 0 || wochentag === 6

      kalenderTage.push(
        <div key={tag} className={`flex flex-col space-y-1 p-2 border rounded ${istWochenende ? 'bg-blue-50' : 'bg-white'}`}>
          <div className="text-center">
            <div className="font-bold">{tag}</div>
            <div className="text-xs text-gray-500">{wochentagName}</div>
          </div>
          <div className="flex space-x-1">
            <Input
              placeholder="Von"
              value={arbeitszeiten[tag]?.von || ''}
              onChange={(e) => setArbeitszeit(tag, 'von', e.target.value)}
              className="text-xs h-8"
            />
            <Input
              placeholder="Bis"
              value={arbeitszeiten[tag]?.bis || ''}
              onChange={(e) => setArbeitszeit(tag, 'bis', e.target.value)}
              className="text-xs h-8"
            />
          </div>
        </div>
      )
    }

    return kalenderTage
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
          <div className="flex items-center justify-center space-x-2">
            <Calculator className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">IG Metall Hessen - Gehaltsrechner</h1>
          </div>
          <p className="text-gray-600">
            Entgeltgruppe {entgeltgruppen[entgeltgruppe].name} • Optimieren Sie Ihr Netto-Gehalt durch intelligente Arbeitszeit-Planung
          </p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Grunddaten */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Euro className="h-5 w-5" />
                <span>Grunddaten</span>
              </CardTitle>
              <CardDescription>Ihre Basis-Gehaltsdaten (IG Metall Hessen 2025)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Entgeltgruppe</Label>
                <Select value={entgeltgruppe.toString()} onValueChange={(value) => setEntgeltgruppe(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {entgeltgruppen.map((gruppe, index) => (
                      <SelectItem key={index} value={index.toString()}>
                        {gruppe.name} - {gruppe.gehalt.toFixed(2)} €
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Steuerklasse</Label>
                <Select value={steuerklasse.toString()} onValueChange={(value) => setSteuerklasse(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {steuerklassen.map((klasse, index) => (
                      <SelectItem key={index} value={index.toString()}>
                        {klasse.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-4 border-t space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">Brutto-Gehalt:</span>
                  <span>{grundgehalt.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Stundenlohn:</span>
                  <span>{stundenlohn.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Wochenstunden:</span>
                  <span>35</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Steuerklasse:</span>
                  <span>{steuerklasse + 1}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Zeitraum */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>Zeitraum</span>
              </CardTitle>
              <CardDescription>Wählen Sie den Berechnungsmonat</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Monat</Label>
                <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {monate.map((monat, index) => (
                      <SelectItem key={index} value={index.toString()}>
                        {monat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Jahr</Label>
                <Input
                  type="number"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Ergebnis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>Ergebnis</span>
              </CardTitle>
              <CardDescription>Ihr optimiertes Gehalt</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {berechnungsErgebnis && (
                <>
                  <div className="flex justify-between">
                    <span>Grundgehalt:</span>
                    <span>{berechnungsErgebnis.grundgehalt.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Zuschläge:</span>
                    <span className="text-green-600">+{berechnungsErgebnis.zuschlaege.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Brutto gesamt:</span>
                    <span>{berechnungsErgebnis.bruttoGesamt.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg">
                    <span>Netto ca.:</span>
                    <span className="text-green-600">{berechnungsErgebnis.netto.toFixed(2)} €</span>
                  </div>
                  <div className="pt-2 border-t space-y-1 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Überstunden:</span>
                      <span>{berechnungsErgebnis.überstunden.toFixed(1)} h</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Pausenzeit:</span>
                      <span>{berechnungsErgebnis.pausenzeit.toFixed(1)} h</span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Detaillierte Berechnung */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Calculator className="h-5 w-5" />
                <span>Detaillierte Berechnung</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
              >
                Details {showDetails ? 'ausblenden' : 'anzeigen'}
              </Button>
            </CardTitle>
            <CardDescription>Vollständige Aufschlüsselung aller Zuschläge und Abzüge</CardDescription>
          </CardHeader>
          {showDetails && berechnungsErgebnis && (
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-2">Abzüge-Aufschlüsselung</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Lohnsteuer:</span>
                      <span>-{berechnungsErgebnis.details.abzüge.lohnsteuer.toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Rentenversicherung (9,3%):</span>
                      <span>-{berechnungsErgebnis.details.abzüge.rentenversicherung.toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Arbeitslosenversicherung (1,3%):</span>
                      <span>-{berechnungsErgebnis.details.abzüge.arbeitslosenversicherung.toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Krankenversicherung (7,3%):</span>
                      <span>-{berechnungsErgebnis.details.abzüge.krankenversicherung.toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Pflegeversicherung (1,525%):</span>
                      <span>-{berechnungsErgebnis.details.abzüge.pflegeversicherung.toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between font-medium pt-2 border-t">
                      <span>Gesamt Abzüge:</span>
                      <span>-{berechnungsErgebnis.details.abzüge.gesamt.toFixed(2)} €</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Steuerklasse Details</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Freibetrag:</span>
                      <span>{steuerklassen[steuerklasse].freibetrag.toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Steuersatz:</span>
                      <span>{steuerklassen[steuerklasse].steuersatz.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Arbeitszeiten */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Arbeitszeiten - {monate[selectedMonth]} {selectedYear}</span>
            </CardTitle>
            <CardDescription>Tragen Sie Ihre Arbeitszeiten ein. Zuschläge werden automatisch berechnet.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex space-x-2">
                <Button onClick={setStandardArbeitszeiten} variant="outline" size="sm">
                  <Clock className="h-4 w-4 mr-2" />
                  Standard-Zeiten (Mo-Fr 06:00-14:00)
                </Button>
                <Button onClick={alleZeitenLöschen} variant="outline" size="sm">
                  Alle löschen
                </Button>
              </div>
              
              <div className="grid grid-cols-7 gap-2">
                {renderKalender()}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default App
