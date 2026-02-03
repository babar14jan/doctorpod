const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const db = require('../utils/db');

// Helper function to generate unique invoice ID
function generateInvoiceId() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const timestamp = Date.now().toString().slice(-6);
  return `INV${year}${month}${day}${timestamp}`;
}

// Helper function to format currency
function formatCurrency(amount) {
  return `₹${parseFloat(amount || 0).toFixed(2)}`;
}

// Generate Invoice PDF
async function generateInvoice(req, res) {
  try {
    const {
      visit_id,
      consultation_fee = 0,
      medicine_charges = 0,
      lab_charges = 0,
      other_charges = 0,
      other_charges_desc = '',
      discount = 0,
      tax_percentage = 0,
      payment_status = 'unpaid',
      payment_method = null,
      notes = ''
    } = req.body;

    if (!visit_id) {
      return res.status(400).json({ success: false, message: 'Visit ID is required' });
    }

    // Fetch visit details with patient mobile
    const visit = await db.prepare(`
      SELECT v.*, p.mobile as patient_mobile 
      FROM visits v 
      LEFT JOIN patients p ON v.patient_id = p.patient_id 
      WHERE v.visit_id = ?
    `).get(visit_id);
    if (!visit) {
      return res.status(404).json({ success: false, message: 'Visit not found' });
    }

    // Fetch doctor details
    const doctor = await db.prepare('SELECT name, qualification, specialization, mobile, registration_no FROM doctors WHERE doctor_id = ?').get(visit.doctor_id);
    
    // Fetch clinic details
    const clinic = await db.prepare('SELECT name, address, phone, email, logo_path, qr_code_path, upi_id FROM clinics WHERE clinic_id = ?').get(visit.clinic_id);

    // Calculate amounts
    const subtotal = parseFloat(consultation_fee) + parseFloat(medicine_charges) + parseFloat(lab_charges) + parseFloat(other_charges);
    const discountAmount = parseFloat(discount);
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = (taxableAmount * parseFloat(tax_percentage)) / 100;
    const totalAmount = taxableAmount + taxAmount;

    // Generate invoice ID
    const invoice_id = generateInvoiceId();

    // Set payment date if paid
    const payment_date = payment_status === 'paid' ? new Date().toISOString() : null;

    // Get PDF directory
    const basePath = process.env.PDF_DIR || 'public/pdfs/';
    const pdfDir = path.isAbsolute(basePath) ? basePath : path.join(__dirname, '../../', basePath);
    
    if (!fs.existsSync(pdfDir)) {
      fs.mkdirSync(pdfDir, { recursive: true });
    }

    // Create PDF filename
    const filename = `${invoice_id}.pdf`;
    const filepath = path.join(pdfDir, filename);
    const invoice_path = `/pdfs/${filename}`;

    // Save invoice to database
    await db.prepare(`
      INSERT INTO invoices (
        invoice_id, visit_id, clinic_id, patient_name, patient_mobile, doctor_name,
        consultation_fee, medicine_charges, lab_charges, other_charges, other_charges_desc,
        subtotal, discount, tax_percentage, tax_amount, total_amount,
        payment_status, payment_method, payment_date, invoice_path, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      invoice_id, visit_id, visit.clinic_id, visit.patient_name, visit.patient_mobile || '',
      doctor?.name || 'Doctor', consultation_fee, medicine_charges, lab_charges,
      other_charges, other_charges_desc, subtotal, discountAmount, tax_percentage,
      taxAmount, totalAmount, payment_status, payment_method, payment_date,
      invoice_path, notes, req.session?.clinic?.clinic_id || req.session?.doctor?.doctor_id || 'system'
    );

    // Create PDF
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    const pageWidth = doc.page.width;
    const pageMargin = doc.page.margins.left;
    const contentWidth = pageWidth - (pageMargin * 2);

    // Colors
    const primaryColor = '#10b981';
    const darkColor = '#1e293b';
    const mutedColor = '#64748b';
    const borderColor = '#e2e8f0';

    // ===== HEADER =====
    // Logo (if available)
    let logoX = pageMargin;
    if (clinic?.logo_path) {
      try {
        const logoFullPath = path.join(__dirname, '../../public', clinic.logo_path);
        if (fs.existsSync(logoFullPath)) {
          doc.image(logoFullPath, pageMargin, pageMargin, { width: 60, height: 60, fit: [60, 60] });
          logoX = pageMargin + 70;
        }
      } catch (err) {
        console.warn('Logo error:', err.message);
      }
    }

    // Clinic Info (Left)
    doc.font('Helvetica-Bold').fontSize(20).fillColor(darkColor);
    doc.text(clinic?.name || 'Clinic', logoX, pageMargin + 5);
    
    doc.font('Helvetica').fontSize(10).fillColor(mutedColor);
    let yPos = pageMargin + 30;
    if (clinic?.address) {
      doc.text(clinic.address, logoX, yPos, { width: contentWidth * 0.5 });
      yPos = doc.y + 2;
    }
    if (clinic?.phone) doc.text(`Phone: ${clinic.phone}`, logoX, yPos);
    if (clinic?.email) doc.text(`Email: ${clinic.email}`, logoX, doc.y + 2);

    // INVOICE Title (Right)
    doc.font('Helvetica-Bold').fontSize(24).fillColor(primaryColor);
    doc.text('INVOICE', pageWidth - pageMargin - 120, pageMargin, { width: 120, align: 'right' });
    
    doc.font('Helvetica').fontSize(10).fillColor(darkColor);
    doc.text(`#${invoice_id}`, pageWidth - pageMargin - 150, pageMargin + 30, { width: 150, align: 'right' });
    doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, pageWidth - pageMargin - 150, doc.y + 2, { width: 150, align: 'right' });

    doc.moveDown(2);
    doc.moveTo(pageMargin, doc.y).lineTo(pageWidth - pageMargin, doc.y).strokeColor(borderColor).lineWidth(1).stroke();
    doc.moveDown(1);

    // ===== BILL TO / FROM SECTION =====
    const sectionY = doc.y;
    
    // Bill To (Left)
    doc.font('Helvetica-Bold').fontSize(11).fillColor(darkColor);
    doc.text('BILL TO:', pageMargin, sectionY);
    doc.font('Helvetica').fontSize(10).fillColor(darkColor);
    doc.text(visit.patient_name || 'Patient', pageMargin, sectionY + 18);
    if (visit.patient_mobile) doc.text(`Mobile: ${visit.patient_mobile}`, pageMargin, doc.y + 2);
    if (visit.patient_age) doc.text(`Age: ${visit.patient_age}`, pageMargin, doc.y + 2);

    // Doctor Info (Right)
    doc.font('Helvetica-Bold').fontSize(11).fillColor(darkColor);
    doc.text('DOCTOR:', pageWidth - pageMargin - 200, sectionY, { width: 200, align: 'left' });
    doc.font('Helvetica').fontSize(10).fillColor(darkColor);
    doc.text(doctor?.name || 'Doctor', pageWidth - pageMargin - 200, sectionY + 18, { width: 200 });
    if (doctor?.qualification) doc.text(doctor.qualification, pageWidth - pageMargin - 200, doc.y + 2, { width: 200 });
    doc.text(`Visit ID: ${visit_id}`, pageWidth - pageMargin - 200, doc.y + 2, { width: 200 });

    doc.moveDown(2);

    // ===== ITEMS TABLE =====
    const tableTop = doc.y;
    const col1X = pageMargin;
    const col2X = pageWidth - pageMargin - 80;

    // Table Header
    doc.rect(pageMargin, tableTop, contentWidth, 25).fillAndStroke(primaryColor, primaryColor);
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#ffffff');
    doc.text('Description', col1X + 10, tableTop + 8);
    doc.text('Amount', col2X + 10, tableTop + 8, { width: 60, align: 'right' });

    let itemY = tableTop + 30;
    doc.font('Helvetica').fontSize(10).fillColor(darkColor);

    // Consultation Fee
    if (parseFloat(consultation_fee) > 0) {
      doc.text('Consultation Fee', col1X + 10, itemY);
      doc.text(formatCurrency(consultation_fee), col2X + 10, itemY, { width: 60, align: 'right' });
      itemY += 20;
    }

    // Medicine Charges
    if (parseFloat(medicine_charges) > 0) {
      doc.text('Medicine Charges', col1X + 10, itemY);
      doc.text(formatCurrency(medicine_charges), col2X + 10, itemY, { width: 60, align: 'right' });
      itemY += 20;
    }

    // Lab Charges
    if (parseFloat(lab_charges) > 0) {
      doc.text('Lab Tests', col1X + 10, itemY);
      doc.text(formatCurrency(lab_charges), col2X + 10, itemY, { width: 60, align: 'right' });
      itemY += 20;
    }

    // Other Charges
    if (parseFloat(other_charges) > 0) {
      const desc = other_charges_desc || 'Other Charges';
      doc.text(desc, col1X + 10, itemY);
      doc.text(formatCurrency(other_charges), col2X + 10, itemY, { width: 60, align: 'right' });
      itemY += 20;
    }

    itemY += 5;
    doc.moveTo(pageMargin, itemY).lineTo(pageWidth - pageMargin, itemY).strokeColor(borderColor).lineWidth(1).stroke();
    itemY += 10;

    // Subtotal
    doc.font('Helvetica').fontSize(10).fillColor(darkColor);
    doc.text('Subtotal:', col1X + 10, itemY);
    doc.text(formatCurrency(subtotal), col2X + 10, itemY, { width: 60, align: 'right' });
    itemY += 18;

    // Discount
    if (discountAmount > 0) {
      doc.text('Discount:', col1X + 10, itemY);
      doc.text(`- ${formatCurrency(discountAmount)}`, col2X + 10, itemY, { width: 60, align: 'right' });
      itemY += 18;
    }

    // Tax
    if (parseFloat(tax_percentage) > 0) {
      doc.text(`Tax (${tax_percentage}%):`, col1X + 10, itemY);
      doc.text(formatCurrency(taxAmount), col2X + 10, itemY, { width: 60, align: 'right' });
      itemY += 18;
    }

    itemY += 5;
    doc.moveTo(pageMargin, itemY).lineTo(pageWidth - pageMargin, itemY).strokeColor(borderColor).lineWidth(2).stroke();
    itemY += 10;

    // Total
    doc.font('Helvetica-Bold').fontSize(12).fillColor(darkColor);
    doc.text('TOTAL:', col1X + 10, itemY);
    doc.text(formatCurrency(totalAmount), col2X + 10, itemY, { width: 60, align: 'right' });

    itemY += 30;

    // ===== PAYMENT STATUS =====
    if (payment_status === 'paid') {
      doc.roundedRect(pageMargin, itemY, 150, 30, 5).fillAndStroke('#d1fae5', '#10b981');
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#065f46');
      doc.text('✓ PAID', pageMargin + 10, itemY + 9);
      if (payment_method) {
        doc.font('Helvetica').fontSize(9).fillColor('#059669');
        doc.text(`via ${payment_method.toUpperCase()}`, pageMargin + 55, itemY + 10);
      }
    } else {
      doc.roundedRect(pageMargin, itemY, 150, 30, 5).fillAndStroke('#fee2e2', '#ef4444');
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#991b1b');
      doc.text('✗ UNPAID', pageMargin + 10, itemY + 9);
    }

    // ===== QR CODE (if unpaid and UPI available) =====
    if (payment_status === 'unpaid' && clinic?.qr_code_path && clinic?.upi_id) {
      try {
        const qrFullPath = path.join(__dirname, '../../public', clinic.qr_code_path);
        if (fs.existsSync(qrFullPath)) {
          const qrX = pageWidth - pageMargin - 110;
          const qrY = itemY - 10;
          
          doc.roundedRect(qrX, qrY, 110, 130, 5).fillAndStroke('#f8fafc', borderColor);
          doc.image(qrFullPath, qrX + 5, qrY + 5, { width: 100, height: 100 });
          doc.font('Helvetica-Bold').fontSize(8).fillColor(darkColor);
          doc.text('Scan to Pay', qrX, qrY + 110, { width: 110, align: 'center' });
          doc.font('Helvetica').fontSize(7).fillColor(mutedColor);
          doc.text(formatCurrency(totalAmount), qrX, qrY + 120, { width: 110, align: 'center' });
        }
      } catch (err) {
        console.warn('QR code error:', err.message);
      }
    }

    itemY += 50;

    // ===== NOTES =====
    if (notes) {
      doc.font('Helvetica-Bold').fontSize(10).fillColor(darkColor);
      doc.text('Notes:', pageMargin, itemY);
      doc.font('Helvetica').fontSize(9).fillColor(mutedColor);
      doc.text(notes, pageMargin, itemY + 15, { width: contentWidth });
      itemY = doc.y + 10;
    }

    // ===== FOOTER =====
    const footerY = pageWidth - pageMargin - 50;
    doc.moveTo(pageMargin, footerY).lineTo(pageWidth - pageMargin, footerY).strokeColor(borderColor).lineWidth(1).stroke();
    doc.font('Helvetica').fontSize(8).fillColor(mutedColor);
    doc.text('Thank you for choosing our services!', pageMargin, footerY + 10, { width: contentWidth, align: 'center' });
    doc.text(`Generated on ${new Date().toLocaleString('en-IN')}`, pageMargin, footerY + 22, { width: contentWidth, align: 'center' });

    doc.end();

    // Wait for PDF to be written
    stream.on('finish', async () => {
      console.log(`✅ Invoice generated: ${invoice_id}`);
      
      // Check if WhatsApp notification should be sent
      const sendWhatsApp = req.body.send_whatsapp === true || req.body.send_whatsapp === 'true';
      const includePrescription = req.body.include_prescription === true || req.body.include_prescription === 'true';
      let whatsapp_url = null;
      
      console.log('📱 WhatsApp check:', { sendWhatsApp, patient_mobile: visit.patient_mobile });
      
      if (sendWhatsApp && visit.patient_mobile) {
        try {
          // Build URLs
          const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
          const invoicePdfUrl = baseUrl + invoice_path;
          
          let prescriptionPdfUrl = null;
          if (includePrescription && visit.pres_path) {
            prescriptionPdfUrl = baseUrl + (visit.pres_path.startsWith('/') ? visit.pres_path : '/' + visit.pres_path);
          }
          
          let paymentLink = null;
          if (payment_status === 'unpaid') {
            paymentLink = `${baseUrl}/pay/${visit_id}`;
          }
          
          let mobile = visit.patient_mobile.replace(/[^0-9]/g, '');
          if (mobile.length === 10) mobile = '91' + mobile;
          
          // Build compact message (Option B template)
          const invoiceDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
          
          let message = `🏥 *${clinic?.name || 'Medical Clinic'}*\n\n`;
          message += `📋 Invoice #${invoice_id}\n`;
          message += `📅 ${invoiceDate}\n\n`;
          
          message += `👤 Patient: ${visit.patient_name}\n`;
          message += `👨‍⚕️ Doctor: ${doctor?.name || 'Doctor'}\n\n`;
          
          message += `💰 *AMOUNT: ₹${parseFloat(totalAmount).toFixed(2)}*\n`;
          
          if (payment_status === 'paid') {
            message += `✅ Paid`;
            if (payment_method) message += ` via ${payment_method.toUpperCase()}`;
            message += `\n`;
          } else {
            message += `⚠️ Payment Pending\n`;
          }
          
          message += `\n📄 Invoice: ${invoicePdfUrl}\n`;
          
          if (prescriptionPdfUrl) {
            message += `✅ Prescription: ${prescriptionPdfUrl}\n`;
          }
          
          if (payment_status === 'unpaid') {
            message += `\n💳 *Pay via UPI*\n`;
            if (clinic?.upi_id) message += `UPI: ${clinic.upi_id}\n`;
            if (paymentLink) message += `Link: ${paymentLink}\n`;
          }
          
          message += `\n_Powered by DoctorPod_`;
          
          whatsapp_url = `https://wa.me/${mobile}?text=${encodeURIComponent(message)}`;
          
          console.log('✅ WhatsApp URL generated:', whatsapp_url.substring(0, 100) + '...');
          
          // Log notification
          const notificationHelper = require('../utils/notificationHelper');
          notificationHelper.logNotification({
            patientId: visit.patient_mobile,
            type: 'invoice',
            channel: 'whatsapp',
            message: message,
            status: 'sent'
          });
        } catch (whatsappError) {
          console.error('WhatsApp notification error:', whatsappError);
        }
      }
      
      res.json({
        success: true,
        invoice_id,
        invoice_path,
        total_amount: totalAmount,
        payment_status,
        whatsapp_url
      });
    });

    stream.on('error', (err) => {
      console.error('PDF stream error:', err);
      res.status(500).json({ success: false, message: 'Failed to generate invoice PDF' });
    });

  } catch (error) {
    console.error('Invoice generation error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

// Get invoice by ID
async function getInvoice(req, res) {
  try {
    const { invoice_id } = req.params;
    const invoice = await db.prepare('SELECT * FROM invoices WHERE invoice_id = ?').get(invoice_id);
    
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }
    
    res.json({ success: true, invoice });
  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

// Get invoices by clinic
async function getInvoicesByClinic(req, res) {
  try {
    const { clinic_id } = req.params;
    const invoices = await db.prepare('SELECT * FROM invoices WHERE clinic_id = ? ORDER BY created_at DESC').all(clinic_id);
    res.json({ success: true, invoices });
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

// Update payment status
async function updatePaymentStatus(req, res) {
  try {
    const { invoice_id } = req.params;
    const { payment_status, payment_method } = req.body;
    
    const payment_date = payment_status === 'paid' ? new Date().toISOString() : null;
    
    await db.prepare('UPDATE invoices SET payment_status = ?, payment_method = ?, payment_date = ? WHERE invoice_id = ?')
      .run(payment_status, payment_method, payment_date, invoice_id);
    
    console.log(`✅ Payment updated: ${invoice_id} - ${payment_status}`);
    res.json({ success: true, message: 'Payment status updated' });
  } catch (error) {
    console.error('Update payment error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

// Get today's checkouts (visits without invoices)
async function getTodaysCheckouts(req, res) {
  try {
    const { clinic_id } = req.params;
    
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Get today's visits that don't have invoices yet
    const query = `
      SELECT v.*, d.name as doctor_name, p.mobile as patient_mobile
      FROM visits v
      LEFT JOIN doctors d ON v.doctor_id = d.doctor_id
      LEFT JOIN patients p ON v.patient_id = p.patient_id
      LEFT JOIN invoices i ON v.visit_id = i.visit_id
      WHERE v.clinic_id = ? 
        AND DATE(v.visit_time) = ?
        AND i.invoice_id IS NULL
      ORDER BY v.visit_time DESC
    `;
    
    const checkouts = await db.prepare(query).all(clinic_id, today);
    
    res.json({ success: true, checkouts });
  } catch (error) {
    console.error('Get checkouts error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

// Get invoice statistics for clinic
async function getInvoiceStats(req, res) {
  try {
    const { clinic_id } = req.params;
    
    const today = new Date().toISOString().split('T')[0];
    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    
    // Today's revenue
    const todayRevenue = await db.prepare(`
      SELECT COALESCE(SUM(total_amount), 0) as total
      FROM invoices
      WHERE clinic_id = ? AND DATE(created_at) = ?
    `).get(clinic_id, today);
    
    // Pending payments (unpaid invoices)
    const pendingPayments = await db.prepare(`
      SELECT COALESCE(SUM(total_amount), 0) as total
      FROM invoices
      WHERE clinic_id = ? AND payment_status = 'unpaid'
    `).get(clinic_id);
    
    // This month's revenue
    const monthRevenue = await db.prepare(`
      SELECT COALESCE(SUM(total_amount), 0) as total
      FROM invoices
      WHERE clinic_id = ? AND DATE(created_at) >= ?
    `).get(clinic_id, firstDayOfMonth);
    
    // Today's checkouts count
    const todayCheckouts = await db.prepare(`
      SELECT COUNT(*) as count
      FROM visits v
      LEFT JOIN invoices i ON v.visit_id = i.visit_id
      WHERE v.clinic_id = ? AND DATE(v.visit_time) = ? AND i.invoice_id IS NULL
    `).get(clinic_id, today);
    
    res.json({
      success: true,
      stats: {
        today_revenue: todayRevenue.total,
        pending_payments: pendingPayments.total,
        month_revenue: monthRevenue.total,
        today_checkouts: todayCheckouts.count
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

// Get all invoices with filters
async function getAllInvoices(req, res) {
  try {
    const { clinic_id } = req.params;
    const { status, start_date, end_date, patient_search } = req.query;
    
    let query = `
      SELECT i.*, v.patient_name, p.mobile as patient_mobile, d.name as doctor_name
      FROM invoices i
      LEFT JOIN visits v ON i.visit_id = v.visit_id
      LEFT JOIN patients p ON v.patient_id = p.patient_id
      LEFT JOIN doctors d ON v.doctor_id = d.doctor_id
      WHERE i.clinic_id = ?
    `;
    
    const params = [clinic_id];
    
    // Apply filters
    if (status && status !== 'all') {
      query += ' AND i.payment_status = ?';
      params.push(status);
    }
    
    if (start_date) {
      query += ' AND DATE(i.created_at) >= ?';
      params.push(start_date);
    }
    
    if (end_date) {
      query += ' AND DATE(i.created_at) <= ?';
      params.push(end_date);
    }
    
    if (patient_search) {
      query += ' AND (v.patient_name LIKE ? OR p.mobile LIKE ?)';
      params.push(`%${patient_search}%`, `%${patient_search}%`);
    }
    
    query += ' ORDER BY i.created_at DESC';
    
    const invoices = await db.prepare(query).all(...params);
    
    res.json({ success: true, invoices });
  } catch (error) {
    console.error('Get all invoices error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  generateInvoice,
  getInvoice,
  getInvoicesByClinic,
  updatePaymentStatus,
  getTodaysCheckouts,
  getInvoiceStats,
  getAllInvoices
};
