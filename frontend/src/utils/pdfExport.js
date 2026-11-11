import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Brand colors
const C = {
  dark: [11, 14, 20],
  surface: [22, 27, 38],
  primary: [0, 240, 255],
  secondary: [204, 255, 0],
  orange: [255, 107, 53],
  muted: [100, 116, 139],
  text: [15, 23, 42],
  light: [245, 247, 250],
  white: [255, 255, 255],
  green: [52, 211, 153],
};

const formatTime = (min) => {
  if (!min) return '—';
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const fmt = (n, decimals = 1) => (n != null ? Number(n).toFixed(decimals) : '—');
const fmtInr = (n) => n != null ? `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—';

const drawHeader = (doc) => {
  const pageW = doc.internal.pageSize.getWidth();

  // Dark header bar with gradient effect (two rects)
  doc.setFillColor(...C.dark);
  doc.rect(0, 0, pageW, 32, 'F');
  doc.setFillColor(0, 60, 70);
  doc.rect(0, 0, 80, 32, 'F');

  // EcoTrack AI logo text
  doc.setTextColor(...C.primary);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('EcoTrack AI', 12, 14);

  // Tagline
  doc.setTextColor(...C.secondary);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('INTELLIGENT EV ROUTE & ENERGY PLANNING', 12, 22);

  // Right side - badge
  doc.setFillColor(...C.primary);
  doc.roundedRect(pageW - 54, 8, 42, 16, 2, 2, 'F');
  doc.setTextColor(...C.dark);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('EV TRIP REPORT', pageW - 33, 14.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text(`${new Date().toLocaleDateString('en-IN')}`, pageW - 33, 20.5, { align: 'center' });
};

const drawRouteBar = (doc, origin, destination, intermediateStops = []) => {
  const pageW = doc.internal.pageSize.getWidth();
  const y = 32;

  doc.setFillColor(...C.light);
  doc.rect(0, y, pageW, 20, 'F');

  // Origin
  doc.setFillColor(...C.secondary);
  doc.circle(18, y + 10, 3, 'F');
  doc.setTextColor(...C.text);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  const originText = origin?.address?.split(',').slice(0, 2).join(',') || '—';
  doc.text(originText, 24, y + 10.5);

  // Stops
  let xPos = 24 + doc.getTextWidth(originText) + 6;
  if (intermediateStops?.length) {
    intermediateStops.forEach((stop, i) => {
      doc.setTextColor(...C.muted);
      doc.text('→', xPos, y + 10.5);
      xPos += 8;
      doc.setFillColor(...C.primary);
      doc.circle(xPos + 2, y + 10, 2.5, 'F');
      xPos += 6;
      doc.setTextColor(...C.text);
      const stopText = stop?.address?.split(',')[0] || `Stop ${i + 1}`;
      doc.text(stopText, xPos, y + 10.5);
      xPos += doc.getTextWidth(stopText) + 6;
    });
  }

  // Arrow to destination
  doc.setTextColor(...C.muted);
  doc.text('→', xPos, y + 10.5);

  // Destination
  doc.setFillColor(...C.orange);
  doc.circle(pageW - 22, y + 10, 3, 'F');
  doc.setTextColor(...C.text);
  doc.setFont('helvetica', 'bold');
  const destText = destination?.address?.split(',').slice(0, 2).join(',') || '—';
  doc.text(destText, pageW - 17, y + 10.5, { align: 'right' });
};

const drawKpiRow = (doc, summary, startY) => {
  const pageW = doc.internal.pageSize.getWidth();
  const kpis = [
    { label: 'DISTANCE', value: `${fmt(summary?.totalDistanceKm)} km`, color: C.primary },
    { label: 'TOTAL TIME', value: formatTime(summary?.totalTripTimeMin), color: C.secondary },
    { label: 'DRIVE TIME', value: formatTime(summary?.totalDrivingTimeMin), color: C.green },
    { label: 'CHARGE TIME', value: formatTime(summary?.totalChargingTimeMin), color: C.orange },
    { label: 'ENERGY', value: `${fmt(summary?.totalEnergyKwh)} kWh`, color: C.primary },
    { label: 'COST', value: fmtInr(summary?.totalCostInr ?? summary?.totalCostUsd), color: C.secondary },
    { label: 'STOPS', value: String(summary?.numberOfChargingStops || 0), color: C.orange },
    { label: 'FINAL SOC', value: `${fmt(summary?.finalSocPct)}%`, color: C.green },
  ];

  const colW = pageW / kpis.length;

  // KPI background
  doc.setFillColor(...C.surface);
  doc.rect(0, startY, pageW, 24, 'F');

  kpis.forEach((kpi, i) => {
    const x = i * colW + colW / 2;
    // Colored top accent
    doc.setFillColor(...kpi.color);
    doc.rect(i * colW + 2, startY, colW - 4, 2, 'F');

    doc.setTextColor(...kpi.color);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(kpi.value, x, startY + 12, { align: 'center' });

    doc.setTextColor(...C.muted);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.text(kpi.label, x, startY + 19, { align: 'center' });
  });

  return startY + 24;
};

const drawSectionTitle = (doc, title, y, color = C.primary) => {
  doc.setTextColor(...color);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 12, y);
  doc.setDrawColor(...color);
  doc.line(12, y + 1.5, 12 + doc.getTextWidth(title), y + 1.5);
  return y + 6;
};

export const exportTripPDF = (tripData, vehicle) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();

  drawHeader(doc);
  drawRouteBar(doc, tripData.origin, tripData.destination, tripData.intermediateStops);
  let y = drawKpiRow(doc, tripData.summary, 52);
  y += 8;

  // ── Vehicle Specs & Trip Summary (two-column) ──────────────────────────────
  const col1x = 12;
  const col2x = pageW / 2 + 4;
  const sectionTopY = y;

  // Trip Summary (left)
  y = drawSectionTitle(doc, 'TRIP SUMMARY', y);
  autoTable(doc, {
    startY: y,
    head: [],
    body: [
      ['Total Distance', `${fmt(tripData.summary?.totalDistanceKm)} km`],
      ['Total Time', formatTime(tripData.summary?.totalTripTimeMin)],
      ['Driving Time', formatTime(tripData.summary?.totalDrivingTimeMin)],
      ['Charging Time', formatTime(tripData.summary?.totalChargingTimeMin)],
      ['Energy Used', `${fmt(tripData.summary?.totalEnergyKwh)} kWh`],
      ['Charging Cost', fmtInr(tripData.summary?.totalCostInr ?? tripData.summary?.totalCostUsd)],
      ['Charging Stops', String(tripData.summary?.numberOfChargingStops || 0)],
      ['Final Battery', `${fmt(tripData.summary?.finalSocPct)}%`],
    ],
    theme: 'plain',
    styles: { fontSize: 8, cellPadding: [1.5, 2], textColor: C.text },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 38, textColor: C.muted },
      1: { cellWidth: 30, fontStyle: 'bold' },
    },
    margin: { left: col1x, right: pageW / 2 + 4 },
  });
  const leftBottom = doc.lastAutoTable.finalY;

  // Vehicle Specs (right)
  let y2 = sectionTopY;
  y2 = drawSectionTitle(doc, 'VEHICLE SPECS', y2);
  autoTable(doc, {
    startY: y2,
    head: [],
    body: [
      ['Vehicle', vehicle?.name || 'My EV'],
      ['Battery', `${vehicle?.batteryCapacityKwh} kWh`],
      ['Efficiency', `${vehicle?.efficiencyKwhPer100km} kWh/100km`],
      ['Max Charging', `${vehicle?.chargingPowerKw} kW`],
      ['Electricity Rate', `${fmtInr(vehicle?.electricityRatePerKwh)}/kWh`],
    ],
    theme: 'plain',
    styles: { fontSize: 8, cellPadding: [1.5, 2], textColor: C.text },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 35, textColor: C.muted },
      1: { cellWidth: 38, fontStyle: 'bold' },
    },
    margin: { left: col2x },
  });

  // Fuel savings section (right, continued)
  const petrolPricePerL = 100;
  const petrolKmPerL = 15;
  const annualKm = 15000;
  const evCostPerKm = (vehicle?.efficiencyKwhPer100km / 100) * (vehicle?.electricityRatePerKwh || 8);
  const petrolCostPerKm = petrolPricePerL / petrolKmPerL;
  const annualSavings = (petrolCostPerKm - evCostPerKm) * annualKm;
  const rightBottom = doc.lastAutoTable.finalY + 4;

  doc.setFillColor(52, 211, 153, 0.1);
  doc.setFillColor(220, 252, 231);
  doc.roundedRect(col2x, rightBottom, pageW - col2x - 12, 16, 2, 2, 'F');
  doc.setTextColor(22, 101, 52);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('ESTIMATED ANNUAL SAVINGS VS PETROL CAR', col2x + 3, rightBottom + 6);
  doc.setFontSize(11);
  doc.setTextColor(21, 128, 61);
  doc.text(fmtInr(Math.round(annualSavings)), col2x + 3, rightBottom + 13);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(22, 101, 52);
  doc.text(`(${annualKm.toLocaleString()} km/yr, petrol @₹${petrolPricePerL}/L, ${petrolKmPerL}km/L)`, col2x + 3 + doc.getTextWidth(fmtInr(Math.round(annualSavings))) + 2, rightBottom + 13);

  y = Math.max(leftBottom, rightBottom + 20) + 6;

  // ── Charging Stops ─────────────────────────────────────────────────────────
  if (tripData.chargingStops?.length > 0) {
    if (y > 220) { doc.addPage(); y = 18; }
    y = drawSectionTitle(doc, `CHARGING STOPS (${tripData.chargingStops.length})`, y, C.secondary);

    const stopRows = tripData.chargingStops.map((s, i) => [
      String(i + 1),
      s.stationName || 'Charging Stop',
      `${fmt(s.arrivalSocPct, 0)}% → ${fmt(s.departureSocPct, 0)}%`,
      `${fmt(s.energyAddedKwh)} kWh`,
      `${s.chargingPowerKw} kW`,
      `${fmt(s.chargingTimeMin, 0)} min`,
      fmtInr(s.costUsd),
    ]);

    autoTable(doc, {
      startY: y,
      head: [['#', 'Station', 'SoC Change', 'Energy', 'Power', 'Time', 'Cost']],
      body: stopRows,
      theme: 'striped',
      styles: { fontSize: 8, cellPadding: 2.5, textColor: C.text, overflow: 'ellipsize' },
      headStyles: { fillColor: C.surface, textColor: C.secondary, fontStyle: 'bold', fontSize: 7.5 },
      alternateRowStyles: { fillColor: C.light },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 52 },
        2: { cellWidth: 28, halign: 'center' },
        3: { cellWidth: 22, halign: 'center' },
        4: { cellWidth: 18, halign: 'center' },
        5: { cellWidth: 16, halign: 'center' },
        6: { cellWidth: 20, halign: 'right' },
      },
      margin: { left: 12 },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  // ── Turn-by-Turn Navigation ────────────────────────────────────────────────
  if (tripData.navSteps?.length > 0) {
    const steps = tripData.navSteps.slice(0, 25);
    if (y > 230) { doc.addPage(); y = 18; }
    y = drawSectionTitle(doc, `TURN-BY-TURN NAVIGATION (${steps.length} of ${tripData.navSteps.length} steps)`, y, C.primary);

    const navRows = steps.map((s, i) => [
      String(i + 1),
      s.instruction || '—',
      s.road || '—',
      `${fmt(s.distanceKm)} km`,
      `${fmt(s.durationMin, 0)} min`,
    ]);

    autoTable(doc, {
      startY: y,
      head: [['#', 'Instruction', 'Road', 'Dist.', 'Time']],
      body: navRows,
      theme: 'striped',
      styles: { fontSize: 7.5, cellPadding: 2, textColor: C.text },
      headStyles: { fillColor: C.surface, textColor: C.primary, fontStyle: 'bold', fontSize: 7.5 },
      alternateRowStyles: { fillColor: C.light },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 90 },
        2: { cellWidth: 44 },
        3: { cellWidth: 18, halign: 'right' },
        4: { cellWidth: 15, halign: 'right' },
      },
      margin: { left: 12 },
    });
  }

  // ── Footer on every page ───────────────────────────────────────────────────
  const totalPages = doc.internal.getNumberOfPages();
  const pageH = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFillColor(...C.dark);
    doc.rect(0, pageH - 10, pageW, 10, 'F');
    doc.setFillColor(...C.primary);
    doc.rect(0, pageH - 10, 4, 10, 'F');
    doc.setTextColor(...C.muted);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('EcoTrack AI | ecotrack.ai | Intelligent EV Mobility', 10, pageH - 3.5);
    doc.setTextColor(...C.primary);
    doc.text(`${i} / ${totalPages}`, pageW - 12, pageH - 3.5, { align: 'right' });
  }

  const fileName = `EcoTrack_${tripData.origin?.address?.split(',')[0]}_to_${tripData.destination?.address?.split(',')[0]}_${new Date().toISOString().split('T')[0]}.pdf`
    .replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\-\.]/g, '');
  doc.save(fileName);
};
