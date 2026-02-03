const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const db = require('../utils/db');
const { ensurePdfDir } = require('../utils/fileHelper');
const { uploadToDrive, isConfigured: isDriveConfigured } = require('../utils/googleDriveHelper');

// Helper function to add "Dr." prefix for display
function formatDoctorName(name) {
  if (!name) return '';
  const trimmed = name.trim();
  // Don't add if already has Dr./DR./dr. prefix
  if (/^dr\.?\s/i.test(trimmed)) return trimmed;
  return `Dr. ${trimmed}`;
}

// Color palette for modern prescription
const colors = {
  primary: '#10b981',      // Green
  primaryDark: '#059669',
  secondary: '#6366f1',    // Indigo
  accent: '#f59e0b',       // Amber
  text: '#1e293b',
  textMuted: '#64748b',
  border: '#e2e8f0',
  bgLight: '#f8fafc',
  bgAccent: '#f0fdf4',
  white: '#ffffff'
};

async function generatePdf(req, res) {
  try {
    const { visit_id } = req.body;
    if (!visit_id) return res.status(400).json({ success: false, message: 'Missing visit_id' });

    // Fetch visit details from DB
    const hist = await db.prepare('SELECT * FROM visits WHERE visit_id = ?').get(visit_id);
    if (!hist) return res.status(404).json({ success: false, message: 'Visit not found' });

    // Fetch doctor details from DB
    const doctor = await db.prepare('SELECT name, qualification, specialization, mobile, registration_no FROM doctors WHERE doctor_id = ?').get(hist.doctor_id);
    // Fetch clinic name, address, and logo from DB
    const clinic = await db.prepare('SELECT name, address, phone, logo_path FROM clinics WHERE clinic_id = ?').get(hist.clinic_id);

    // Fetch medicines from DB
    let meds = await db.prepare('SELECT medicine_name, frequency, timing FROM prescription_items WHERE visit_id = ?').all(visit_id);
    if (Array.isArray(meds) && meds.length > 0) {
      meds = meds.map(m => ({
        name: m.medicine_name || '-',
        frequency: m.frequency || '-',
        meal_timing: m.timing || '-'
      }));
    } else {
      meds = [];
    }

    // Use DB for diagnosis and advice
    let diagnosis = hist.diagnosis || '';
    let investigations = hist.investigations || '';
    let advice = hist.advice || '';

    // Get PDF directory from environment variable or use default
    const basePath = process.env.PDF_DIR || 'public/pdfs/';
    const pdfDir = path.isAbsolute(basePath) ? basePath : path.join(__dirname, '../../', basePath);
    
    // Ensure PDF directory exists
    if (!fs.existsSync(pdfDir)) {
      fs.mkdirSync(pdfDir, { recursive: true });
    }
    
    // Patient info
    const patientName = hist.patient_name || 'Patient';
    const patientAge = hist.patient_age || '';
    const patientGender = hist.patient_gender || '';
    const safeName = (patientName || 'patient').replace(/[^a-zA-Z0-9_\-]/g, '_');
    const dateStr = new Date(hist.timestamp || hist.created_at)
      .toISOString()
      .replace(/[-:.TZ]/g, '')
      .slice(0, 14); // Format as DDMMYYHHMMSS
    const filename = `${safeName}_${dateStr}.pdf`;
    const filepath = path.join(pdfDir, filename);

    // Create PDF with standard margins (50pt = ~0.7 inch)
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    const pageWidth = doc.page.width;
    const pageMargin = doc.page.margins.left;
    const contentWidth = pageWidth - (pageMargin * 2);

    // Doctor/Clinic info
    const doctorName = formatDoctorName(doctor?.name) || 'Doctor';
    const doctorDegree = doctor?.qualification || '';
    const doctorSpec = doctor?.specialization || '';
    const doctorMobile = doctor?.mobile || '';
    const doctorRegNo = doctor?.registration_no || '';
    const clinicName = clinic?.name || 'Clinic';
    const clinicAddress = clinic?.address || '';
    const clinicPhone = clinic?.phone || '';
    const clinicLogoPath = clinic?.logo_path || null;

    // ===== HEADER SECTION =====
    // Gradient header bar (respecting margins)
    const headerHeight = 80;
    
    // Create gradient background
    doc.rect(pageMargin, pageMargin, contentWidth, headerHeight)
       .fillAndStroke('#10b981', '#10b981');
    
    // Add a lighter accent at the top
    doc.rect(pageMargin, pageMargin, contentWidth, 4)
       .fill('#059669');
    
    // White line below header for separation
    doc.moveTo(pageMargin, pageMargin + headerHeight).lineTo(pageWidth - pageMargin, pageMargin + headerHeight).strokeColor('#10b981').lineWidth(2).stroke();

    // Check if logo exists and is valid
    let hasLogo = false;
    if (clinicLogoPath) {
      try {
        const logoFullPath = path.join(__dirname, '../../public', clinicLogoPath);
        if (fs.existsSync(logoFullPath)) {
          // Add clinic logo (top-left corner of header)
          doc.image(logoFullPath, pageMargin, pageMargin + 5, { 
            width: 60, 
            height: 60,
            fit: [60, 60],
            align: 'left'
          });
          hasLogo = true;
        }
      } catch (logoErr) {
        console.warn('Failed to load clinic logo:', logoErr.message);
      }
    }

    // Clinic Name (left side - left aligned, adjusted for logo presence)
    const clinicTextX = hasLogo ? pageMargin + 70 : pageMargin;
    const clinicTextWidth = hasLogo ? contentWidth * 0.55 - 70 : contentWidth * 0.55;
    
    doc.font('Helvetica-Bold').fontSize(18).fillColor('#ffffff');
    doc.text(clinicName, clinicTextX, pageMargin + 15, { width: clinicTextWidth, align: 'left' });
    
    let clinicInfoY = pageMargin + 38;
    if (clinicAddress) {
      doc.font('Helvetica').fontSize(10).fillColor('#ffffff');
      doc.text(clinicAddress, clinicTextX, clinicInfoY, { width: clinicTextWidth, align: 'left' });
      clinicInfoY = doc.y + 2;
    }
    if (clinicPhone) {
      doc.font('Helvetica').fontSize(10).fillColor('#ffffff');
      doc.text(`Tel: ${clinicPhone}`, clinicTextX, clinicInfoY, { width: clinicTextWidth, align: 'left' });
    }

    // Doctor info (right side - right aligned)
    const rightX = pageWidth - pageMargin - 180;
    doc.font('Helvetica-Bold').fontSize(13).fillColor('#ffffff');
    doc.text(`${doctorName}`, rightX, pageMargin + 15, { width: 170, align: 'right' });
    
    doc.font('Helvetica').fontSize(10).fillColor('#ffffff');
    let docInfoY = pageMargin + 32;
    if (doctorDegree) {
      doc.text(doctorDegree, rightX, docInfoY, { width: 170, align: 'right' });
      docInfoY += 12;
    }
    if (doctorSpec) {
      doc.text(doctorSpec, rightX, docInfoY, { width: 170, align: 'right' });
      docInfoY += 12;
    }
    if (doctorRegNo) {
      doc.text(`Reg: ${doctorRegNo}`, rightX, docInfoY, { width: 170, align: 'right' });
      docInfoY += 12;
    }
    if (doctorMobile) {
      doc.text(`Mob: ${doctorMobile}`, rightX, docInfoY, { width: 170, align: 'right' });
    }

    doc.y = pageMargin + headerHeight + 15;

    // ===== PATIENT INFO CARD =====
    const patientCardY = doc.y;
    const patientCardHeight = 45;
    
    // Light background card
    doc.roundedRect(pageMargin, patientCardY, contentWidth, patientCardHeight, 5)
       .fill(colors.bgLight);
    
    // Left border accent (light gray)
    doc.rect(pageMargin, patientCardY, 4, patientCardHeight).fill('#e2e8f0');
    
    // Patient info inside card
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#000000');
    doc.text(patientName, pageMargin + 15, patientCardY + 10);
    
    // Age/Gender
    const ageGender = [patientAge ? `${patientAge} yrs` : '', patientGender].filter(Boolean).join(' / ');
    if (ageGender) {
      doc.font('Helvetica').fontSize(10).fillColor('#000000');
      doc.text(ageGender, pageMargin + 15, patientCardY + 26);
    }

    // Date and Visit ID on right
    const visitDate = new Date(hist.timestamp || hist.created_at).toLocaleDateString('en-GB', { 
      day: '2-digit', month: 'short', year: 'numeric' 
    });
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#000000');
    doc.text(`Date: ${visitDate}`, pageWidth - pageMargin - 140, patientCardY + 10, { width: 130, align: 'right' });
    doc.font('Helvetica').fontSize(8).fillColor('#000000');
    doc.text(`Visit ID: ${visit_id}`, pageWidth - pageMargin - 140, patientCardY + 26, { width: 130, align: 'right' });

    doc.y = patientCardY + patientCardHeight + 12;

    // ===== VITALS SECTION (Plain text) =====
    let temp = (typeof req.body.temperature === 'string' && req.body.temperature.trim()) ? req.body.temperature.trim() : '';
    let bp = (typeof req.body.blood_pressure === 'string' && req.body.blood_pressure.trim()) ? req.body.blood_pressure.trim() : '';
    
    if (temp || bp) {
      const vitalsY = doc.y;
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#000000');
      
      let vitalsText = '';
      if (temp) vitalsText += `Temp: ${temp}`;
      if (temp && bp) vitalsText += '    ';
      if (bp) vitalsText += `BP: ${bp}`;
      
      doc.text(vitalsText, pageMargin, vitalsY);
      doc.y = vitalsY + 18;
    }

    // ===== DIAGNOSIS SECTION =====
    if (diagnosis) {
      doc.y = doc.y + 5; // Add spacing before diagnosis
      const diagY = doc.y;
      
      // Section header with styled background
      const diagText = 'DIAGNOSIS';
      doc.font('Helvetica-Bold').fontSize(12);
      const diagTextWidth = doc.widthOfString(diagText);
      const diagBoxWidth = diagTextWidth + 12;
      const diagBoxHeight = 16;
      doc.roundedRect(pageMargin, diagY, diagBoxWidth, diagBoxHeight, 3).fill('#e2e8f0');
      doc.fillColor('#000000');
      doc.text(diagText, pageMargin + 6, diagY + 4);
      
      // Diagnosis content with subtle background
      const diagLines = diagnosis.split('\n').filter(l => l.trim());
      let diagContentY = diagY + 24;
      
      diagLines.forEach(line => {
        doc.font('Helvetica').fontSize(11).fillColor('#000000');
        doc.text(`• ${line.trim()}`, pageMargin + 5, diagContentY);
        diagContentY = doc.y + 3;
      });
      
      doc.y = diagContentY + 6;
    }

    // ===== MEDICINES (Rx) SECTION =====
    if (meds.length > 0) {
      doc.y = doc.y + 20; // Add spacing before Rx section
      const rxY = doc.y;
      
      // Rx symbol in its own box
      doc.roundedRect(pageMargin, rxY, 28, 24, 4).fill('#e2e8f0');
      doc.font('Helvetica-Bold').fontSize(16).fillColor('#000000');
      doc.text('Rx', pageMargin + 5, rxY + 5);
      
      // Comma separator
      doc.font('Helvetica-Bold').fontSize(16).fillColor('#000000');
      doc.text(',', pageMargin + 28, rxY + 5);
      
      doc.y = rxY + 32;
      
      // Table
      const tableY = doc.y;
      const colWidths = [28, contentWidth * 0.48, contentWidth * 0.22, contentWidth * 0.22 - 28];
      const headerRowHeight = 22;
      
      // Header background (light gray)
      doc.rect(pageMargin, tableY, contentWidth, headerRowHeight).fill('#e2e8f0');
      
      // Header text (fully black)
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#000000');
      let colX = pageMargin;
      doc.text('#', colX + 8, tableY + 6, { width: colWidths[0] });
      colX += colWidths[0];
      doc.text('Medicine Name', colX + 6, tableY + 6, { width: colWidths[1] });
      colX += colWidths[1];
      doc.text('Frequency', colX + 6, tableY + 6, { width: colWidths[2] });
      colX += colWidths[2];
      doc.text('Timing', colX + 6, tableY + 6, { width: colWidths[3] });
      
      doc.y = tableY + headerRowHeight;
      
      // Medicine rows
      const rowHeight = 24;
      meds.forEach((med, i) => {
        const rowY = doc.y;
        const isEven = i % 2 === 0;
        
        // Row background
        doc.rect(pageMargin, rowY, contentWidth, rowHeight)
           .fill(isEven ? colors.white : colors.bgLight);
        
        // Row border
        doc.moveTo(pageMargin, rowY + rowHeight).lineTo(pageMargin + contentWidth, rowY + rowHeight)
           .strokeColor(colors.border).lineWidth(0.5).stroke();
        
        colX = pageMargin;
        
        // Number
        doc.font('Helvetica-Bold').fontSize(11).fillColor('#000000');
        doc.text(`${i + 1}`, colX + 10, rowY + 7, { width: colWidths[0] - 10 });
        colX += colWidths[0];
        
        // Medicine name
        doc.font('Helvetica-Bold').fontSize(11).fillColor('#000000');
        doc.text(med.name, colX + 6, rowY + 7, { width: colWidths[1] - 10 });
        colX += colWidths[1];
        
        // Frequency
        doc.font('Helvetica').fontSize(11).fillColor('#000000');
        doc.text(med.frequency, colX + 6, rowY + 7, { width: colWidths[2] - 10 });
        colX += colWidths[2];
        
        // Timing
        doc.text(med.meal_timing, colX + 6, rowY + 7, { width: colWidths[3] - 10 });
        
        doc.y = rowY + rowHeight;
      });
      
      // Table outer border
      const tableEndY = doc.y;
      doc.rect(pageMargin, tableY, contentWidth, tableEndY - tableY)
         .strokeColor(colors.border).lineWidth(1).stroke();
      
      doc.y = tableEndY + 12;
    }

    // ===== INVESTIGATIONS SECTION =====
    if (investigations) {
      doc.y = doc.y + 5; // Add spacing before investigations
      const invY = doc.y;
      
      // Section header with styled background (same as diagnosis)
      const invText = 'INVESTIGATIONS';
      doc.font('Helvetica-Bold').fontSize(12);
      const invTextWidth = doc.widthOfString(invText);
      const invBoxWidth = invTextWidth + 12;
      const invBoxHeight = 16;
      doc.roundedRect(pageMargin, invY, invBoxWidth, invBoxHeight, 3).fill('#e2e8f0');
      doc.fillColor('#000000');
      doc.text(invText, pageMargin + 6, invY + 4);
      
      // Investigation content
      const invLines = investigations.split('\n').filter(l => l.trim());
      let invContentY = invY + 22;
      
      invLines.forEach(line => {
        doc.font('Helvetica').fontSize(11).fillColor('#000000');
        doc.text(`• ${line.trim()}`, pageMargin + 5, invContentY);
        invContentY = doc.y + 3;
      });
      
      doc.y = invContentY + 6;
    }

    // ===== ADVICE SECTION =====
    if (advice) {
      const advY = doc.y;
      
      // Advice card with gray background
      const advLines = advice.split('\n').filter(l => l.trim());
      const adviceCardHeight = Math.max(18 + (advLines.length * 16), 36);
      
      doc.roundedRect(pageMargin, advY, contentWidth, adviceCardHeight, 5).fill('#f1f5f9');
      doc.rect(pageMargin, advY, 4, adviceCardHeight).fill('#64748b');
      
      doc.font('Helvetica-Bold').fontSize(12).fillColor('#000000');
      doc.text('ADVICE', pageMargin + 12, advY + 8);
      
      doc.font('Helvetica').fontSize(11).fillColor('#000000');
      let advContentY = advY + 22;
      advLines.forEach(line => {
        doc.text(`• ${line.trim()}`, pageMargin + 12, advContentY);
        advContentY = doc.y + 2;
      });
      
      doc.y = advY + adviceCardHeight + 12;
    }

    // ===== SIGNATURE SECTION =====
    const signatureAreaY = doc.y + 180;

    // Doctor Signature (right side, above footer line)
    const sigWidth = 140;
    const sigX = pageWidth - pageMargin - sigWidth;
    const sigY = signatureAreaY + 45;
    
    doc.moveTo(sigX, sigY).lineTo(sigX + sigWidth, sigY)
       .strokeColor(colors.text).lineWidth(0.8).stroke();
    
    doc.font('Helvetica').fontSize(11).fillColor('#000000');
    doc.text('Doctor\'s Signature', sigX, sigY + 4, { width: sigWidth, align: 'center' });

    // Move to bottom area for footer line
    const footerY = Math.max(signatureAreaY + 70, doc.page.height - 45);

    // Divider line
    doc.moveTo(pageMargin, footerY)
       .lineTo(pageWidth - pageMargin, footerY)
       .strokeColor(colors.border).lineWidth(0.5).stroke();

    doc.end();

    stream.on('finish', async () => {
      try {
        // Build the public path (server-relative)
        const publicPath = `/${basePath.replace(/^public\//, '')}${filename}`;

        // Store this path in visits table
        await db.prepare('UPDATE visits SET pres_path = ? WHERE visit_id = ?').run(publicPath, visit_id);

        res.json({ success: true, pdfPath: publicPath });
      } catch (e) {
        res.status(500).json({ success: false, message: e.message });
      }
    });
    
    stream.on('error', (err) => {
      res.status(500).json({ success: false, message: err.message });
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}

module.exports = { generatePdf };
