'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { API_ENDPOINTS } from '@/lib/constants';
import {
    Search, Receipt, TrendingUp, CheckCircle, Clock, AlertTriangle,
    Plus, Download, MoreVertical, X, Calendar, User, Building,
    Phone, Mail, MapPin, FileText, Trash2, Eye, Stethoscope, Pencil, CreditCard
} from 'lucide-react';
import CustomSelect from '@/components/layouts/CustomSelect';
import { toast } from 'react-toastify';
import { usePermissions } from '@/hooks/usePermissions';

const CATEGORIES = ['Surgery', 'Machine Sale', 'Machine Rental', 'Consumables'];
const STATUSES = ['pending', 'partial', 'paid', 'overdue'];
const CUSTOMER_TYPES = ['Patient', 'Hospital', 'Doctor'];

export default function BillingPage() {
    const router = useRouter();
    const { user } = usePermissions();
    const [invoices, setInvoices] = useState([]);
    const [stats, setStats] = useState({
        total_bills: 0,
        total_revenue: 0,
        paid_amount: 0,
        pending_amount: 0,
        overdue_count: 0
    });
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [showGenerateModal, setShowGenerateModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [openDropdown, setOpenDropdown] = useState(null);

    const fetchInvoices = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (categoryFilter !== 'all') params.append('category', categoryFilter);
            if (statusFilter !== 'all') params.append('status', statusFilter);
            if (searchQuery) params.append('search', searchQuery);

            const response = await axios.get(`${API_ENDPOINTS.BILLING}?${params.toString()}`);
            setInvoices(response.data.invoices || []);
            setStats(response.data.stats || {});
        } catch (error) {
            console.error('Error fetching invoices:', error);
            toast.error('Error fetching invoices');
        } finally {
            setLoading(false);
        }
    }, [categoryFilter, statusFilter, searchQuery]);

    const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const action = searchParams ? searchParams.get('action') : null;
    const hospitalId = searchParams ? searchParams.get('hospital_id') : null;
    const billType = searchParams ? searchParams.get('bill_type') : null;

    /* checkAuth and redundant duplicate useEffect have been removed */
    useEffect(() => { if (user) fetchInvoices(); }, [user, fetchInvoices]);

    useEffect(() => {
        if (action === 'generate' && hospitalId) {
            setShowGenerateModal(true);
        }
    }, [action, hospitalId]);

    const handleGenerateInvoice = async (formData, extraData) => {
        try {
            await axios.post(API_ENDPOINTS.BILLING, { ...formData, ...extraData });
            fetchInvoices();
            setShowGenerateModal(false);

            // clear URL params
            if (action && hospitalId) {
                router.replace('/admin/billing');
            }

            toast.success('Invoice generated successfully!');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error generating invoice');
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount || 0);
    };

    // Helper to split GST
    const calculateGstSplit = (amount, percentage) => {
        const gstAmount = (amount * percentage) / 100;
        const cgst = gstAmount / 2;
        const sgst = gstAmount / 2;
        return { gstAmount, cgst, sgst };
    };

    const formatDate = (date) => {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const getStatusBadge = (status) => {
        const styles = {
            paid: 'bg-green-100 text-green-700 border-green-200',
            partial: 'bg-yellow-100 text-yellow-700 border-yellow-200',
            pending: 'bg-gray-100 text-gray-700 border-gray-200',
            overdue: 'bg-red-100 text-red-700 border-red-200'
        };
        const icons = { paid: CheckCircle, partial: Clock, pending: Clock, overdue: AlertTriangle };
        const Icon = icons[status] || Clock;
        return (
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full border ${styles[status] || styles.pending}`}>
                <Icon size={12} />
                {status?.toUpperCase()}
            </span>
        );
    };

    const getCategoryBadge = (category) => {
        const colors = {
            'Surgery': 'bg-blue-50 text-blue-700',
            'Machine Sale': 'bg-purple-50 text-purple-700',
            'Machine Rental': 'bg-teal-50 text-teal-700',
            'Consumables': 'bg-orange-50 text-orange-700'
        };
        return (
            <span className={`px-2 py-0.5 text-xs font-medium rounded ${colors[category] || 'bg-gray-50 text-gray-700'}`}>
                {category}
            </span>
        );
    };

    const getCustomerIcon = (type) => {
        if (type === 'Hospital') return Building;
        if (type === 'Doctor') return Stethoscope;
        return User;
    };

    const StatCard = ({ icon: Icon, label, value, color }) => (
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${color}`}>
                    <Icon size={22} className="text-current" />
                </div>
                <div>
                    <p className="text-sm text-gray-500">{label}</p>
                    <p className="text-xl font-bold text-gray-900">{value}</p>
                </div>
            </div>
        </div>
    );

    const handleViewDetails = (invoice) => {
        setSelectedInvoice(invoice);
        setShowDetailsModal(true);
        setOpenDropdown(null);
    };

    const handleDownloadPDF = (invoice) => {
        setSelectedInvoice(invoice);
        setOpenDropdown(null);
        // Trigger PDF generation
        generatePDF(invoice);
    };

    const handleEditInvoice = (invoice) => {
        setSelectedInvoice(invoice);
        setShowEditModal(true);
        setOpenDropdown(null);
    };

    const handleDeleteInvoice = async (invoice) => {
        if (!confirm(`Are you sure you want to delete invoice ${invoice.invoice_number}?`)) return;

        try {
            await axios.delete(`${API_ENDPOINTS.BILLING}?id=${invoice.id}`);
            toast.success('Invoice deleted successfully');
            fetchInvoices();
        } catch (error) {
            console.error('Error deleting invoice:', error);
            toast.error('Error deleting invoice');
        }
        setOpenDropdown(null);
    };

    // Payment Modal State
    const [showPaymentModal, setShowPaymentModal] = useState(false);

    const handleRecordPayment = async (paymentData) => {
        try {
            const currentHistory = typeof selectedInvoice.payment_history === 'string'
                ? JSON.parse(selectedInvoice.payment_history)
                : selectedInvoice.payment_history || [];

            const newHistory = [...currentHistory, {
                amount: Number(paymentData.amount),
                date: paymentData.payment_date,
                method: paymentData.payment_method,
                reference: paymentData.reference,
                notes: paymentData.notes
            }];

            const newPaidAmount = Number(selectedInvoice.paid_amount) + Number(paymentData.amount);
            const maxPermitted = Number(selectedInvoice.total_amount);

            if (newPaidAmount > maxPermitted) {
                toast.error(`Payment blocked: Cannot pay more than the balance due.`);
                setLoading(false);
                return;
            }

            let newStatus = selectedInvoice.payment_status;

            // Auto-update status logic
            if (newPaidAmount >= maxPermitted) {
                newStatus = 'paid';
            } else if (newPaidAmount > 0) {
                newStatus = 'partial';
            }

            await axios.put(API_ENDPOINTS.BILLING, {
                id: selectedInvoice.id,
                paid_amount: newPaidAmount,
                payment_status: newStatus,
                payment_history: JSON.stringify(newHistory)
            });

            toast.success('Payment recorded successfully');
            setShowPaymentModal(false);
            setSelectedInvoice(null);
            fetchInvoices();
        } catch (error) {
            console.error('Error recording payment:', error);
            toast.error('Failed to record payment');
        }
    };

    const handleUpdateInvoice = async (formData) => {
        try {
            await axios.put(API_ENDPOINTS.BILLING, { id: selectedInvoice.id, ...formData });
            toast.success('Invoice updated successfully');
            setShowEditModal(false);
            setSelectedInvoice(null);
            fetchInvoices();
        } catch (error) {
            console.error('Error updating invoice:', error);
            toast.error('Error updating invoice');
        }
    };

    // Format currency for PDF (using Rs. instead of ₹ symbol which jsPDF can't render)
    const formatCurrencyPDF = (amount) => {
        return 'Rs. ' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(amount || 0);
    };

    // Number to words helper
    const numberToWords = (num) => {
        const a = ['', 'one ', 'two ', 'three ', 'four ', 'five ', 'six ', 'seven ', 'eight ', 'nine ', 'ten ', 'eleven ', 'twelve ', 'thirteen ', 'fourteen ', 'fifteen ', 'sixteen ', 'seventeen ', 'eighteen ', 'nineteen '];
        const b = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
        const n2w = (n) => {
            if (n < 20) return a[n];
            const digit = n % 10;
            return b[Math.floor(n / 10)] + (digit ? '-' + a[digit] : '');
        }

        num = parseInt(num);
        if (num === 0) return 'zero';
        let str = '';

        if (Math.floor(num / 10000000) > 0) {
            str += numberToWords(Math.floor(num / 10000000)) + 'crore ';
            num %= 10000000;
        }
        if (Math.floor(num / 100000) > 0) {
            str += numberToWords(Math.floor(num / 100000)) + 'lakh ';
            num %= 100000;
        }
        if (Math.floor(num / 1000) > 0) {
            str += numberToWords(Math.floor(num / 1000)) + 'thousand ';
            num %= 1000;
        }
        if (Math.floor(num / 100) > 0) {
            str += numberToWords(Math.floor(num / 100)) + 'hundred ';
            num %= 100;
        }
        if (num > 0) {
            if (str !== '') str += 'and ';
            str += n2w(num);
        }
        return str.trim();
    };

    const generatePDF = async (invoice) => {
        const { jsPDF } = await import('jspdf');
        const doc = new jsPDF();

        // Configuration
        const startX = 10;
        const startY = 10;
        const pageWidth = 190;
        let currentY = startY;

        const lineItems = typeof invoice.line_items === 'string'
            ? JSON.parse(invoice.line_items)
            : invoice.line_items || [];

        // Helper for text
        const txt = (text, x, y, size = 10, align = 'left', bold = false) => {
            doc.setFontSize(size);
            doc.setFont('helvetica', bold ? 'bold' : 'normal');
            doc.text(String(text), x, y, { align });
        };

        // --- HEADER GRID ---
        const headerH = 32; // Reduced from 35
        doc.rect(startX, currentY, pageWidth, headerH);

        // Vertical Divider at approx 60%
        const midX = startX + 110;
        doc.line(midX, currentY, midX, currentY + headerH);

        // Left Box: Company Details
        txt('PRIMEBRIDGE HEALTH PRIVATE LIMITED', startX + 2, currentY + 4, 9, 'left', true);
        txt('Flat No.: Plot No.395 & 396 Road/Street: Kanti', startX + 2, currentY + 7.5, 7);
        txt('Vanam Colony', startX + 2, currentY + 10.5, 7);
        txt('Locality: Kondapur City/Town/Village:', startX + 2, currentY + 13.5, 7);
        txt('Hyderabad', startX + 2, currentY + 16.5, 7);
        txt('State: Telangana PIN Code:500084', startX + 2, currentY + 19.5, 7);
        txt('GSTIN/UIN   : 36AAQCP2909Q1ZL', startX + 2, currentY + 23.5, 8, 'left', true);
        txt('State Name  : Telangana, Code: 36', startX + 2, currentY + 27, 7);


        doc.setFillColor(255, 255, 255);
        doc.rect(midX, currentY, pageWidth - (midX - startX), headerH, 'F'); // Clear
        doc.rect(midX, currentY, pageWidth - (midX - startX), headerH); // Redraw Border

        const hLineH = headerH / 5; // 5 Rows approx 7mm each
        const hRow1 = currentY;
        const hRow2 = currentY + hLineH;
        const hRow3 = currentY + (hLineH * 2);
        const hRow4 = currentY + (hLineH * 3);
        const hRow5 = currentY + (hLineH * 4); // Last row top

        // Draw horizontal lines
        doc.line(midX, hRow2, startX + pageWidth, hRow2);
        doc.line(midX, hRow3, startX + pageWidth, hRow3);
        doc.line(midX, hRow4, startX + pageWidth, hRow4);
        doc.line(midX, hRow5, startX + pageWidth, hRow5);

        // Row 1: Invoice No | Date
        txt('Invoice No.', midX + 2, hRow1 + 3, 7); // Reduced font
        txt(invoice.invoice_number, midX + 2, hRow1 + 6, 8, 'left', true);
        txt('Dated', midX + 42, hRow1 + 3, 7);
        txt(formatDate(invoice.bill_date), midX + 42, hRow1 + 6, 8, 'left', true);

        // Row 2: Mode/Terms
        txt('Mode/Terms of Payment', midX + 2, hRow2 + 3, 7);
        txt(invoice.payment_status?.toUpperCase() || '-', midX + 2, hRow2 + 6, 8);

        // Row 3: Dispatch Doc No | Delivery Note Date (Placeholder)
        txt('Dispatch Doc No.', midX + 2, hRow3 + 3, 7);
        txt(invoice.dispatch_doc_no || '-', midX + 2, hRow3 + 6, 8);
        // If we had Delivery Note Date, it would go right. Leaving blank or putting placeholder as per request "Real Invoice"
        // The real invoice has "Delivery Note Date" here. We don't have that field explicitly, maybe use Bill Date or blank.

        // Row 4: Dispatched Through | Destination
        txt('Dispatched through', midX + 2, hRow4 + 3, 7);
        txt(invoice.dispatch_through || '-', midX + 2, hRow4 + 6, 8);
        txt('Destination', midX + 42, hRow4 + 3, 7);
        txt(invoice.destination || '-', midX + 42, hRow4 + 6, 8);

        // Row 5: Motor Vehicle No? Or Blank. Real invoice has Bill of Lading / Motor Vehicle No.
        // We will leave it empty or put placeholders if needed. 
        // User asked "where is dispatched through", so Row 4 covers it.

        currentY += headerH;


        // --- BUYER (BILL TO) SECTION (Dynamic Height) ---

        // 1. Calculate Content Height first
        let contentH = 6; // Reduced Padding
        const lineSpacing = 3.5; // Tighter spacing

        // Buyer Content Simulation
        let bLines = 1; // "Buyer (Bill to)"
        bLines += 1; // Customer Name

        let hospLines = 0;
        if (invoice.hospital_name) {
            hospLines += 1; // Name
            if (invoice.hospital_address) {
                const ha = doc.splitTextToSize(invoice.hospital_address, (pageWidth / 2) - 10);
                hospLines += ha.length;
            }
        }

        let docLines = invoice.doctor_name ? 1 : 0;

        // Address (Removed per request, but if present logic remains) -> 0

        let metaLines = 0;
        if (invoice.uhid) metaLines++;
        if (invoice.ip_number) metaLines++;
        if (invoice.hospital_gst_number) metaLines++;
        metaLines++; // State Name

        const leftContentCount = bLines + hospLines + docLines + metaLines;
        const leftH = (leftContentCount * lineSpacing) + 12; // Increased padding from 8

        // Right Content (Terms) Simulation
        let termLinesCount = 1; // "Terms of Delivery" 
        const tLines = doc.splitTextToSize(invoice.terms_conditions || '', (pageWidth / 2) - 6);
        termLinesCount += tLines.length;
        const rightH = (termLinesCount * lineSpacing) + 12; // Increased padding from 8

        let buyerH = Math.max(leftH, rightH, 35); // Increased min height slightly

        doc.rect(startX, currentY, pageWidth, buyerH);

        // Draw Left Content
        let by = currentY + 4;
        txt('Buyer (Bill to)', startX + 2, by, 9, 'left', true);
        by += 4;

        // Hospital (Top)
        if (invoice.hospital_name) {
            txt(invoice.hospital_name, startX + 2, by, 9, 'left', true);
            by += lineSpacing;
            if (invoice.hospital_address) {
                const hospAddrLines = doc.splitTextToSize(invoice.hospital_address, (pageWidth / 2) - 6);
                doc.setFontSize(8); // Reduced size for address
                doc.setFont('helvetica', 'normal');
                doc.text(hospAddrLines, startX + 2, by);
                by += (hospAddrLines.length * lineSpacing);
            }
        }

        // Doctor Name (Fetched from DB)
        if (invoice.doctor_name_from_db) {
            let drName = invoice.doctor_name_from_db;
            if (!drName.toLowerCase().startsWith('dr')) {
                drName = `DR. ${drName}`;
            }
            txt(`Doctor Name: ${drName}`, startX + 2, by, 9, 'left', true);
            by += lineSpacing;
        }

        // Patient Name
        let patName = invoice.customer_name;
        if (invoice.patient_gender) {
            const g = invoice.patient_gender.toLowerCase();
            const prefix = g === 'female' ? 'MRS.' : 'MR.';
            // Avoid double prefix
            if (!patName.toLowerCase().startsWith('mr') && !patName.toLowerCase().startsWith('mrs')) {
                patName = `${prefix} ${patName}`;
            }
        }
        txt(`Patient Name : ${patName}`, startX + 2, by, 9, 'left', true);
        by += lineSpacing;

        // Meta
        if (invoice.uhid) { txt(`UHID: ${invoice.uhid}`, startX + 2, by, 8); by += lineSpacing; }
        if (invoice.ip_number) { txt(`IP No: ${invoice.ip_number}`, startX + 2, by, 8); by += lineSpacing; }

        // Hospital GST
        if (invoice.hospital_gst_number) {
            txt(`Hospital GSTIN: ${invoice.hospital_gst_number}`, startX + 2, by, 8);
            by += lineSpacing;
        }

        txt(`State Name : Telangana, Code: 36`, startX + 2, by, 8);

        // Draw Divider
        const splitX = startX + (pageWidth / 2);
        doc.line(splitX, currentY, splitX, currentY + buyerH);

        // Draw Right Content (Terms)
        let ty = currentY + 4;
        txt('Terms of Delivery', splitX + 2, ty, 9, 'left', true);
        ty += 4;
        const termLines = doc.splitTextToSize(invoice.terms_conditions || '', (pageWidth / 2) - 6);
        doc.setFontSize(8); // Reduced size
        doc.setFont('helvetica', 'normal');
        doc.text(termLines, splitX + 2, ty);

        currentY += buyerH;

        // --- LINE ITEMS TABLE ---
        const tableHeadH = 8;
        doc.rect(startX, currentY, pageWidth, tableHeadH);

        const colW = { sl: 10, desc: 80, hsn: 20, qty: 15, rate: 20, disc: 15, amt: 30 };
        const colX = {
            sl: startX,
            desc: startX + colW.sl,
            hsn: startX + colW.sl + colW.desc,
            qty: startX + colW.sl + colW.desc + colW.hsn,
            rate: startX + colW.sl + colW.desc + colW.hsn + colW.qty,
            disc: startX + colW.sl + colW.desc + colW.hsn + colW.qty + colW.rate,
            amt: startX + colW.sl + colW.desc + colW.hsn + colW.qty + colW.rate + colW.disc
        };

        const headY = currentY + 5;
        txt('Sl', colX.sl + 2, headY, 9, 'left', true);
        txt('Description of Goods', colX.desc + 2, headY, 9, 'left', true);
        txt('HSN/SAC', colX.hsn + 2, headY, 8, 'left', true); // Smaller Header
        txt('Qty', colX.qty + 2, headY, 9, 'left', true);
        txt('Rate', colX.rate + 2, headY, 9, 'left', true);
        txt('Disc %', colX.disc + 2, headY, 8, 'left', true); // "per Disc %"
        txt('Amount', colX.amt + 2, headY, 9, 'left', true);

        const drawVerts = (y1, y2) => {
            Object.values(colX).slice(1).forEach(x => doc.line(x, y1, x, y2));
        };
        drawVerts(currentY, currentY + tableHeadH);
        currentY += tableHeadH;

        const bodyStartY = currentY;
        const minBodyH = 80; // Min height for body

        lineItems.forEach((item, i) => {
            // Description Construction
            let descStr = item.description || '';
            const details = [];
            if (item.batch_no) details.push(`Batch: ${item.batch_no}`);
            if (item.mfg_date) details.push(`Mfg Dt: ${formatDate(item.mfg_date)}`);
            if (item.exp_date) details.push(`Expiry: ${formatDate(item.exp_date)}`);

            const descLines = doc.splitTextToSize(descStr, colW.desc - 4);
            const detailLines = details.length > 0 ? doc.splitTextToSize(details.join(' | '), colW.desc - 4) : [];

            const rowH = Math.max(10, ((descLines.length + detailLines.length) * 4) + 4);

            txt(i + 1, colX.sl + 2, currentY + 5, 9);

            // Description text
            doc.text(descLines, colX.desc + 2, currentY + 5);
            if (detailLines.length > 0) {
                doc.setFont('helvetica', 'bold'); // Bold for batch details details
                doc.text(detailLines, colX.desc + 2, currentY + 5 + (descLines.length * 4));
                doc.setFont('helvetica', 'normal');
            }

            txt(item.hsnsac || '', colX.hsn + 2, currentY + 6, 9);
            txt(`${item.quantity} Nos`, colX.qty + 2, currentY + 6, 9);
            txt(formatCurrencyPDF(item.unit_price), colX.rate + 2, currentY + 6, 9);
            txt('', colX.disc + 2, currentY + 6, 9); // Disc % blank per line or logic?
            txt(formatCurrencyPDF(item.quantity * item.unit_price), colX.amt + 2, currentY + 6, 9, 'left', true);

            currentY += rowH;
        });

        // Fill remaining height
        if (currentY - bodyStartY < minBodyH) currentY = bodyStartY + minBodyH;

        doc.rect(startX, bodyStartY, pageWidth, currentY - bodyStartY);
        drawVerts(bodyStartY, currentY);

        // --- TOTALS & TAXES ---
        const subtotal = Number(invoice.subtotal);
        const discountP = Number(invoice.discount_percentage || 0);
        const discountAmt = (subtotal * discountP) / 100;
        const afterDisc = subtotal - discountAmt;
        const tdsP = Number(invoice.tds_percentage || 0);
        const tdsAmt = (afterDisc * tdsP) / 100;
        const taxable = afterDisc - tdsAmt;
        const taxP = Number(invoice.tax_percentage || 18);
        const { cgst, sgst } = calculateGstSplit(taxable, taxP);
        const totalVal = taxable + cgst + sgst;

        const rowH = 7;
        const addTotalRow = (label, val, isBold = false) => {
            doc.rect(startX, currentY, pageWidth, rowH);
            doc.line(colX.amt, currentY, colX.amt, currentY + rowH); // Vertical line for Amount col
            // Label in Rate column area (merged)
            txt(label, colX.rate + 15, currentY + 5, 9, 'right', isBold);
            txt(formatCurrencyPDF(val), colX.amt + 2, currentY + 5, 9, 'left', isBold);
            currentY += rowH;
        }

        if (tdsAmt > 0) addTotalRow(`Less: TDS (${tdsP}%)`, -tdsAmt);
        if (cgst > 0) {
            addTotalRow(`OUTPUT CGST ${taxP / 2}%`, cgst, true);
            addTotalRow(`OUTPUT SGST ${taxP / 2}%`, sgst, true);
        }

        // Grand Total
        addTotalRow('Total', totalVal, true);

        // Amount in Words
        const wordsH = 8;
        doc.rect(startX, currentY, pageWidth, wordsH);
        txt(`Chargeable Amount (in words) : INR ${numberToWords(Math.round(totalVal))} Only`, startX + 2, currentY + 5.5, 9, 'left', true);
        currentY += wordsH;

        // HSN/Tax Summary Grid
        const taxSumH = 12;
        doc.rect(startX, currentY, pageWidth, taxSumH);
        // Header line
        doc.line(startX, currentY + 6, startX + pageWidth, currentY + 6);

        // Cols: HSN, Taxable Value, Central Tax, State Tax, Total Tax
        const txW = pageWidth / 5;
        const txX = [startX, startX + txW, startX + txW * 2, startX + txW * 3, startX + txW * 4];

        const centerTxt = (t, x, y, b = false) => txt(t, x + (txW / 2), y, 8, 'center', b);

        // Headings
        centerTxt('HSN/SAC', txX[0], currentY + 4);
        centerTxt('Taxable Value', txX[1], currentY + 4);
        centerTxt('Central Tax', txX[2], currentY + 4);
        centerTxt('State Tax', txX[3], currentY + 4);
        centerTxt('Total Tax', txX[4], currentY + 4);

        // Values
        const hsnVal = lineItems[0]?.hsnsac || '';
        centerTxt(hsnVal, txX[0], currentY + 10);
        centerTxt(formatCurrencyPDF(taxable), txX[1], currentY + 10);
        centerTxt(formatCurrencyPDF(cgst), txX[2], currentY + 10);
        centerTxt(formatCurrencyPDF(sgst), txX[3], currentY + 10);
        centerTxt(formatCurrencyPDF(cgst + sgst), txX[4], currentY + 10);

        currentY += taxSumH;

        // Tax Words
        const taxWordH = 8;
        doc.rect(startX, currentY, pageWidth, taxWordH);
        txt(`Tax Amount (in words) : INR ${numberToWords(Math.round(cgst + sgst))} Only`, startX + 2, currentY + 5.5, 9, 'left', true);
        currentY += taxWordH;

        const bankStr =
            (invoice.company_bank_name ? `Bank: ${invoice.company_bank_name}\nA/c: ${invoice.company_account_number}\nIFSC: ${invoice.company_ifsc_code}\nBranch: ${invoice.company_branch_name}` : null) ||
            invoice.hospital_bank_details ||
            invoice.company_bank_details ||
            invoice.bank_details;

        const footerH = 38; // Reduced Footer Height
        if (currentY + footerH > 290) { // More permissive page break (297 is max A4)
            doc.addPage(); currentY = 10;
        }

        doc.rect(startX, currentY, pageWidth, footerH);
        const midFootX = startX + 110;
        doc.line(midFootX, currentY, midFootX, currentY + footerH);

        // Left Content
        let ly = currentY + 4;
        txt('Company Bank Details', startX + 2, ly, 9, 'left', true);
        ly += 4;
        const bankLines = doc.splitTextToSize(bankStr, 100);
        doc.setFontSize(8); // Smaller bank text
        doc.setFont('helvetica', 'normal');
        doc.text(bankLines, startX + 2, ly);
        ly += (bankLines.length * 3.5) + 3;

        txt('Declaration', startX + 2, ly, 9, 'left', true);
        ly += 4;
        doc.setFontSize(7); // Smaller declaration
        txt('We declare that this invoice shows the actual price of the', startX + 2, ly, 7);
        txt('goods described and that all particulars are true and correct.', startX + 2, ly + 3, 7);

        // Right Content
        txt('For: Prime Bridge Health Pvt. Ltd.', midFootX + 2, currentY + 5, 9);
        // Signature area
        txt('Authorized Signatory', midFootX + 2, currentY + footerH - 5, 9);

        // Save
        doc.save(`${invoice.invoice_number}.pdf`);
        toast.success('PDF downloaded successfully!');
    };

    if (loading && !invoices.length) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-[#19ADB8] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading billing data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Billing & Invoices</h1>
                    <p className="text-gray-500">Manage bills for surgeries, machines, and consumables</p>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <button
                        onClick={() => setShowGenerateModal(true)}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-[#19ADB8] hover:bg-[#17a0ab] text-white rounded-lg font-medium shadow-lg shadow-[#19ADB8]/30"
                    >
                        <Plus size={18} />
                        Generate Invoice
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                <StatCard icon={Receipt} label="Total Bills" value={stats.total_bills || 0} color="bg-blue-50 text-blue-600" />
                <StatCard icon={TrendingUp} label="Total Revenue" value={formatCurrency(stats.total_revenue)} color="bg-indigo-50 text-indigo-600" />
                <StatCard icon={CheckCircle} label="Paid Amount" value={formatCurrency(stats.paid_amount)} color="bg-green-50 text-green-600" />
                <StatCard icon={Clock} label="Pending" value={formatCurrency(stats.pending_amount)} color="bg-yellow-50 text-yellow-600" />
                <StatCard icon={AlertTriangle} label="Overdue" value={stats.overdue_count || 0} color="bg-red-50 text-red-600" />
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6 shadow-sm">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search by invoice number or customer name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#19ADB8] focus:border-transparent"
                        />
                    </div>
                    <div className="w-full md:w-48">
                        <CustomSelect
                            value={categoryFilter}
                            onChange={setCategoryFilter}
                            options={[
                                { value: 'all', label: 'All Categories' },
                                ...CATEGORIES.map(c => ({ value: c, label: c }))
                            ]}
                        />
                    </div>
                    <div className="w-full md:w-48">
                        <CustomSelect
                            value={statusFilter}
                            onChange={setStatusFilter}
                            options={[
                                { value: 'all', label: 'All Statuses' },
                                ...STATUSES.map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))
                            ]}
                        />
                    </div>
                </div>
            </div>

            {/* Invoice List */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
                {invoices.length === 0 ? (
                    <div className="text-center py-16">
                        <Receipt className="mx-auto text-gray-300 mb-4" size={48} />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices found</h3>
                        <p className="text-gray-500 mb-4">Get started by generating your first invoice</p>
                        <button onClick={() => setShowGenerateModal(true)} className="px-4 py-2 bg-[#19ADB8] text-white rounded-lg font-medium">Generate Invoice</button>
                    </div>
                ) : (
                    <div className="divide-y-0 space-y-4">
                        {invoices.map((invoice) => {
                            const CustomerIcon = getCustomerIcon(invoice.customer_type);
                            return (
                                <div key={invoice.id} className="relative p-5 hover:bg-gray-50 transition-colors border border-gray-100 rounded-xl bg-white shadow-sm">
                                    <div className="flex flex-col sm:flex-row items-start gap-4">
                                        <div className="p-3 bg-teal-50 rounded-xl hidden sm:block">
                                            <Receipt className="text-teal-600" size={24} />
                                        </div>
                                        <div className="flex-1 w-full min-w-0">
                                            <div className="flex items-center justify-between sm:justify-start gap-3 mb-1">
                                                <h3 className="font-semibold text-gray-900">{invoice.invoice_number}</h3>
                                                <div className="flex items-center gap-2">
                                                    {getCategoryBadge(invoice.category)}
                                                    {getStatusBadge(invoice.payment_status)}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 text-sm text-gray-500">
                                                <span className="flex items-center gap-1">
                                                    <CustomerIcon size={14} />
                                                    {invoice.customer_name}
                                                    <span className="text-gray-400">({invoice.customer_type})</span>
                                                </span>
                                                <span className="text-[#004071] font-medium">Total: {formatCurrency(invoice.total_amount)}</span>
                                            </div>
                                        </div>
                                        <div className="hidden md:flex flex-col gap-1 text-sm text-gray-500 min-w-[160px]">
                                            <div className="flex items-center gap-2"><Calendar size={14} />Bill Date: {formatDate(invoice.bill_date)}</div>
                                            <div className="flex items-center gap-2"><Clock size={14} />Due: {formatDate(invoice.due_date)}</div>
                                        </div>
                                        <div className="w-full sm:w-auto flex items-center justify-between sm:block text-right min-w-[120px] mt-2 sm:mt-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-gray-100">
                                            <p className="text-xs text-gray-500 mb-1 sm:block hidden">Payment Status</p>
                                            <p className={`font-semibold ${invoice.payment_status === 'paid' ? 'text-green-600' : 'text-[#19ADB8]'}`}>Paid: {formatCurrency(invoice.paid_amount)}</p>
                                            {invoice.payment_status !== 'paid' && <p className="text-xs text-red-500">Balance: {formatCurrency(invoice.total_amount - invoice.paid_amount)}</p>}
                                        </div>
                                        <div className="absolute top-4 right-4 sm:relative sm:top-0 sm:right-0">
                                            <button
                                                onClick={() => setOpenDropdown(openDropdown === invoice.id ? null : invoice.id)}
                                                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"
                                            >
                                                <MoreVertical size={18} />
                                            </button>
                                            {openDropdown === invoice.id && (
                                                <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-[150px]">
                                                    <button onClick={() => handleViewDetails(invoice)} className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                                                        <Eye size={16} /> View Details
                                                    </button>
                                                    <button onClick={() => handleDownloadPDF(invoice)} className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                                                        <Download size={16} /> Download PDF
                                                    </button>
                                                    <div className="border-t border-gray-100 my-1"></div>
                                                    <button onClick={() => handleEditInvoice(invoice)} className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                                                        <Pencil size={16} /> Edit Invoice
                                                    </button>
                                                    {invoice.payment_status !== 'paid' && (Number(invoice.total_amount) - Number(invoice.paid_amount) > 0) && (
                                                        <button onClick={() => { setSelectedInvoice(invoice); setShowPaymentModal(true); setOpenDropdown(null); }} className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                                                            <CreditCard size={16} /> Record Payment
                                                        </button>
                                                    )}
                                                    <button onClick={() => handleDeleteInvoice(invoice)} className="w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                                                        <Trash2 size={16} /> Delete
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Generate Invoice Modal */}
            {showGenerateModal && <GenerateInvoiceModal
                onClose={() => {
                    setShowGenerateModal(false);
                    // Clear params if closed without submitting
                    if (action && hospitalId) router.replace('/admin/billing');
                }}
                onSubmit={handleGenerateInvoice}
                initialHospitalId={hospitalId}
                initialBillType={billType}
            />}

            {/* Invoice Details Modal */}
            {showDetailsModal && selectedInvoice && (
                <InvoiceDetailsModal
                    invoice={selectedInvoice}
                    onClose={() => { setShowDetailsModal(false); setSelectedInvoice(null); }}
                    onDownloadPDF={() => generatePDF(selectedInvoice)}
                    formatCurrency={formatCurrency}
                    formatDate={formatDate}
                    getStatusBadge={getStatusBadge}
                />
            )}

            {/* Edit Invoice Modal */}
            {showEditModal && selectedInvoice && (
                <EditInvoiceModal
                    invoice={selectedInvoice}
                    onClose={() => { setShowEditModal(false); setSelectedInvoice(null); }}
                    onSubmit={handleUpdateInvoice}
                />
            )}

            {/* Record Payment Modal */}
            {showPaymentModal && selectedInvoice && (
                <RecordPaymentModal
                    invoice={selectedInvoice}
                    onClose={() => { setShowPaymentModal(false); setSelectedInvoice(null); }}
                    onSubmit={handleRecordPayment}
                />
            )}
        </div>
    );
}

// Invoice Details Modal Component
function InvoiceDetailsModal({ invoice, onClose, onDownloadPDF, formatCurrency, formatDate, getStatusBadge }) {
    const lineItems = typeof invoice.line_items === 'string'
        ? JSON.parse(invoice.line_items)
        : invoice.line_items || [];

    const paymentHistory = typeof invoice.payment_history === 'string'
        ? JSON.parse(invoice.payment_history)
        : invoice.payment_history || [];

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 z-10">
                    <div className="w-full sm:w-auto text-center sm:text-left">
                        <h2 className="text-xl font-bold text-gray-900">Invoice Details</h2>
                        <p className="text-sm text-gray-500">View complete invoice information for {invoice.invoice_number}</p>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-end">
                        <button onClick={onDownloadPDF} className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium flex-1 sm:flex-initial">
                            <Download size={16} /> <span className="sm:inline">Download PDF</span>
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    {/* Company & Invoice Header */}
                    {/* Company & Invoice Header */}
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-6">
                        <div>
                            <h3 className="text-2xl font-bold text-[#19ADB8]">SurgiPartner</h3>
                            <p className="text-sm text-gray-500">Surgical Equipment & Services</p>
                            <p className="text-sm text-gray-500">New Delhi, India</p>
                            <p className="text-sm text-gray-500">contact@surgipartner.com</p>
                            <p className="text-sm text-gray-500">+91 11 XXXX XXXX</p>
                        </div>
                        <div className="text-left sm:text-right w-full sm:w-auto">
                            <h4 className="text-xl font-semibold text-gray-900">{invoice.invoice_number}</h4>
                            <div className="mt-1">{getStatusBadge(invoice.payment_status)}</div>
                        </div>
                    </div>

                    {/* Bill To & Invoice Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                            <p className="text-sm text-gray-500 mb-2">BILL TO</p>
                            <div className="flex items-center gap-2 mb-1">
                                <User size={16} className="text-gray-400" />
                                <span className="font-medium text-gray-900">{invoice.customer_name}</span>
                            </div>
                            {invoice.customer_email && <p className="text-sm text-gray-600">{invoice.customer_email}</p>}
                            {invoice.customer_phone && <p className="text-sm text-gray-600">{invoice.customer_phone}</p>}
                            {invoice.customer_address && <p className="text-sm text-gray-600">{invoice.customer_address}</p>}
                            <span className="inline-block mt-2 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">{invoice.customer_type}</span>
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm">
                                    <Calendar size={14} className="text-gray-400" />
                                    <span className="text-gray-500">Bill Date:</span>
                                    <span className="font-medium">{formatDate(invoice.bill_date)}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <Clock size={14} className="text-gray-400" />
                                    <span className="text-gray-500">Due Date:</span>
                                    <span className="font-medium">{formatDate(invoice.due_date)}</span>
                                </div>
                                <div className="bg-yellow-50 p-3 rounded-lg mt-3">
                                    <p className="text-xs text-yellow-700">Category</p>
                                    <p className="font-semibold text-yellow-900">{invoice.category}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Dispatch & Bank Sections */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-gray-100">
                        {invoice.dispatch_doc_no && (
                            <div>
                                <h4 className="text-sm font-semibold text-gray-900 mb-2">DISPATCH DETAILS</h4>
                                <div className="text-sm space-y-1 text-gray-600">
                                    <p><span className="text-gray-500">Doc No:</span> {invoice.dispatch_doc_no}</p>
                                    <p><span className="text-gray-500">Through:</span> {invoice.dispatch_through}</p>
                                    <p><span className="text-gray-500">Destination:</span> {invoice.destination}</p>
                                </div>
                            </div>
                        )}

                        {(invoice.company_bank_name || invoice.company_account_number) && (
                            <div>
                                <h4 className="text-sm font-semibold text-gray-900 mb-2">BANK DETAILS</h4>
                                <div className="bg-gray-50 p-3 rounded-lg text-sm space-y-1 text-gray-700 border border-gray-100">
                                    <p className="font-medium">{invoice.company_bank_name}</p>
                                    <p>Branch: {invoice.company_branch_name}</p>
                                    <p>IFSC: {invoice.company_ifsc_code}</p>
                                    <p>A/c No: {invoice.company_account_number}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Line Items */}
                    <div>
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">ITEMS</h4>
                        <div className="border rounded-lg overflow-hidden">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Description</th>
                                        <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Qty</th>
                                        <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Unit Price</th>
                                        <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {lineItems.map((item, index) => (
                                        <tr key={index}>
                                            <td className="px-4 py-3 text-sm text-gray-900">
                                                <p className="font-medium">{item.description}</p>
                                                {item.hsnsac && <p className="text-xs text-gray-500">HSN: {item.hsnsac}</p>}
                                                {(item.batch_no || item.mfg_date || item.exp_date) && (
                                                    <div className="flex flex-wrap gap-x-3 text-xs text-gray-500 mt-1">
                                                        {item.batch_no && <span>Batch: {item.batch_no}</span>}
                                                        {item.mfg_date && <span>Mfg: {item.mfg_date}</span>}
                                                        {item.exp_date && <span>Exp: {item.exp_date}</span>}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-center text-[#19ADB8] align-top pt-3">{item.quantity}</td>
                                            <td className="px-4 py-3 text-sm text-right text-gray-600 align-top pt-3">{formatCurrency(item.unit_price)}</td>
                                            <td className="px-4 py-3 text-sm text-right font-medium text-gray-900 align-top pt-3">{formatCurrency(invoice.discount_percentage > 0 ? (item.quantity * item.unit_price) * (1 - invoice.discount_percentage / 100) : (item.quantity * item.unit_price))}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Totals */}
                    <div className="flex justify-end">
                        <div className="w-full sm:w-64 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Subtotal:</span>
                                <span className="font-medium">{formatCurrency(invoice.subtotal)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">GST ({invoice.tax_percentage || 18}%):</span>
                                <span className="font-medium">{formatCurrency(invoice.tax_amount)}</span>
                            </div>
                            <div className="flex justify-between text-base font-bold pt-2 border-t">
                                <span>Total Amount:</span>
                                <span>{formatCurrency(invoice.total_amount)}</span>
                            </div>
                            <div className="flex justify-between text-sm text-green-600">
                                <span>Paid Amount:</span>
                                <span>{formatCurrency(invoice.paid_amount)}</span>
                            </div>
                            <div className="flex justify-between text-base font-bold text-red-600">
                                <span>Balance Due:</span>
                                <span>{formatCurrency(invoice.total_amount - invoice.paid_amount)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Payment History */}
                    {paymentHistory.length > 0 && (
                        <div>
                            <h4 className="text-sm font-semibold text-gray-900 mb-3">PAYMENT HISTORY</h4>
                            <div className="space-y-2">
                                {paymentHistory.map((payment, index) => (
                                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <CheckCircle size={18} className="text-green-600" />
                                            <div>
                                                <p className="font-medium text-gray-900">{formatCurrency(payment.amount)} - {payment.method}</p>
                                                <p className="text-xs text-gray-500">{formatDate(payment.date)} • Ref: {payment.reference}</p>
                                            </div>
                                        </div>
                                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">Paid</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Notes */}
                    {invoice.notes && (
                        <div>
                            <h4 className="text-sm font-semibold text-gray-900 mb-2">NOTES</h4>
                            <p className="text-sm text-gray-700">{invoice.notes}</p>
                        </div>
                    )}

                    {/* Terms */}
                    {invoice.terms_conditions && (
                        <div>
                            <h4 className="text-sm font-semibold text-blue-600 mb-2">TERMS OF DELIVERY</h4>
                            <p className="text-sm text-gray-700 whitespace-pre-line">{invoice.terms_conditions}</p>
                        </div>
                    )}

                    {/* Footer */}
                    <div className="text-center text-xs text-gray-400 pt-4 border-t">
                        <p>Generated on {formatDate(invoice.created_at)}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Generate Invoice Modal Component
// Generate Invoice Modal Component
function GenerateInvoiceModal({ onClose, onSubmit, initialHospitalId, initialBillType }) {
    const [formData, setFormData] = useState({
        category: 'Surgery',
        customer_type: 'Patient',
        customer_name: '',
        customer_email: '',
        customer_phone: '',
        customer_address: '',
        customer_gstin: '', // New
        customer_gstin: '', // New
        uhid: '',
        ip_number: '',
        hospital_id: initialHospitalId || '',
        due_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        line_items: [{ description: '', hsnsac: '', quantity: 1, unit_price: 0 }],
        tax_percentage: 18,
        discount_percentage: 0,
        tds_percentage: 0,
        notes: '',
        terms_conditions: 'Payment due within 15 days. Late payment charges applicable after due date.',
        dispatch_doc_no: '', dispatch_through: 'Surgery Service', destination: '',
        company_bank_name: 'IDFC Bank Limited', company_branch_name: 'Kondapur Branch Hyderabad', company_ifsc_code: 'IDFB0080205', company_account_number: '59949402354'
    });

    const [unbilledIds, setUnbilledIds] = useState({ consumable_ids: [], machine_ids: [] });
    const [loadingUnbilled, setLoadingUnbilled] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Search States
    const [patientSearch, setPatientSearch] = useState('');
    const [patients, setPatients] = useState([]);
    const [showPatientDropdown, setShowPatientDropdown] = useState(false);

    // Fetch Unbilled Items if initialHospitalId is provided
    useEffect(() => {
        if (initialHospitalId) {
            const fetchUnbilled = async () => {
                setLoadingUnbilled(true);
                try {
                    // 1. Fetch Hospital Details
                    const hospRes = await axios.get(`${API_ENDPOINTS.HOSPITALS}?id=${initialHospitalId}`);
                    const hospital = hospRes.data.hospital;

                    // 2. Fetch Unbilled
                    const unbilledRes = await axios.get(`/api/v1/hospitals/unbilled?hospital_id=${initialHospitalId}`);
                    const { consumables, machines } = unbilledRes.data;

                    const lineItems = [];
                    const cIds = [];
                    const mIds = [];
                    let defaultCategory = 'Consumables';

                    // Determine which items to include based on bill type
                    const includeConsumables = !initialBillType || initialBillType === 'consumables';
                    const includeMachines = !initialBillType || initialBillType === 'machines';

                    if (includeConsumables && consumables && consumables.length > 0) {
                        consumables.forEach(c => {
                            lineItems.push({
                                description: `${c.item_name} (${c.sku})`,
                                hsnsac: '',
                                quantity: c.quantity || 1,
                                unit_price: c.selling_price || 0,
                                hospital_consumable_id: c.id, // Store ID for restoration
                                batch_no: c.batch_number || '',
                                mfg_date: '', // Initialize to empty string
                                exp_date: c.expiry_date ? new Date(c.expiry_date).toISOString().split('T')[0] : ''
                            });
                            cIds.push(c.id);
                        });
                    }

                    if (includeMachines) {
                        let machinesToProcess = [...(machines || [])];

                        if (hospital.assigned_machines && hospital.assigned_machines.length > 0) {
                            const existingIds = new Set(machinesToProcess.map(m => m.id));
                            hospital.assigned_machines.forEach(m => {
                                if (!existingIds.has(m.id)) {
                                    machinesToProcess.push(m);
                                }
                            });
                        }

                        if (machinesToProcess.length > 0) {
                            defaultCategory = 'Machine Rental'; // Default to Rental

                            machinesToProcess.forEach(m => {
                                const salePrice = Number(m.sale_price || 0);
                                const rentalPrice = Number(m.rental_price || 0);
                                const purchasePrice = Number(m.purchase_price || 0);

                                let isRent = m.status === 'Rented' || m.type === 'For Rental' || m.type === 'For Rent';

                                if (m.rental_start_date && m.rental_end_date) {
                                    isRent = true;
                                }

                                if (!isRent && m.type === 'For Sale') {
                                    if ((salePrice === 0 && purchasePrice === 0) && rentalPrice > 0) {
                                        isRent = true;
                                    }
                                }

                                if (!isRent && m.type === 'For Sale') defaultCategory = 'Machine Sale';

                                let unitPrice = 0;
                                if (isRent) {
                                    unitPrice = rentalPrice;
                                } else {
                                    unitPrice = salePrice || purchasePrice;
                                }

                                lineItems.push({
                                    description: `${isRent ? 'Rental' : 'Sale'} of ${m.machine_name} (S/N: ${m.serial_number})`,
                                    hsnsac: '',
                                    quantity: 1,
                                    unit_price: unitPrice || 0,
                                    machine_id: m.id,
                                    batch_no: '',
                                    mfg_date: '',
                                    exp_date: ''
                                });
                                mIds.push(m.id);
                            });
                        }
                    }

                    if (initialBillType === 'machines') defaultCategory = 'Machine Rental';
                    else if (initialBillType === 'consumables') defaultCategory = 'Consumables';

                    if (lineItems.length === 0) {
                        lineItems.push({ description: '', hsnsac: '', quantity: 1, unit_price: 0 });
                    }

                    setFormData(prev => ({
                        ...prev,
                        category: defaultCategory,
                        customer_type: 'Hospital',
                        customer_name: hospital.name,
                        customer_email: hospital.email || '',
                        customer_phone: hospital.phone || '',
                        customer_address: `${hospital.address}, ${hospital.city}`,
                        customer_gstin: hospital.gst_number || '',
                        hospital_id: initialHospitalId,
                        line_items: lineItems
                    }));

                    setHospitalSearch(hospital.name);
                    setUnbilledIds({
                        consumable_ids: includeConsumables ? cIds : [],
                        machine_ids: includeMachines ? mIds : []
                    });

                } catch (error) {
                    console.error("Error loading unbilled data", error);
                    toast.error("Failed to load unbilled items");
                } finally {
                    setLoadingUnbilled(false);
                }
            };
            fetchUnbilled();
        }
    }, [initialHospitalId, initialBillType]);

    // Machine Search
    const [machineSearch, setMachineSearch] = useState('');
    const [machines, setMachines] = useState([]);
    const [showMachineDropdown, setShowMachineDropdown] = useState(false);

    const [activeLineItemIndex, setActiveLineItemIndex] = useState(null);

    // Hospital Search (for Linked Hospital)
    const [hospitalSearch, setHospitalSearch] = useState('');
    const [hospitals, setHospitals] = useState([]);
    const [showHospitalDropdown, setShowHospitalDropdown] = useState(false);

    // Debounce search (Patient)
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (patientSearch.length > 2 && formData.customer_type === 'Patient') {
                try {
                    const res = await axios.get(`${API_ENDPOINTS.PATIENTS}?search=${patientSearch}`);
                    setPatients(res.data.patients || []);
                    setShowPatientDropdown(true);
                } catch (e) {
                    console.error("Patient search failed", e);
                }
            } else {
                setShowPatientDropdown(false);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [patientSearch, formData.customer_type]);

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (machineSearch.length > 2 && (formData.category === 'Machine Sale' || formData.category === 'Machine Rental')) {
                try {
                    // Assuming machine API supports search
                    const res = await axios.get(`${API_ENDPOINTS.MACHINES}?search=${machineSearch}`);
                    setMachines(res.data.machines || []);
                    setShowMachineDropdown(true);
                } catch (e) { console.error("Machine search failed", e); }
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [machineSearch, formData.category]);

    // Debounce search (Hospital)
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (hospitalSearch.length > 2) {
                try {
                    const res = await axios.get(`${API_ENDPOINTS.HOSPITALS}?search=${hospitalSearch}`);
                    setHospitals(res.data.hospitals || []);
                    setShowHospitalDropdown(true);
                } catch (e) { console.error("Hospital search failed", e); }
            } else {
                setShowHospitalDropdown(false);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [hospitalSearch]);

    const selectPatient = async (patient) => {
        setFormData(prev => ({
            ...prev,
            customer_name: `${patient.first_name} ${patient.last_name}`,
            customer_email: patient.email || '',
            customer_phone: patient.phone || '',
            customer_address: patient.address || '',
            uhid: patient.uhid || '',
            ip_number: patient.ip_number || '',
            hospital_id: patient.primary_hospital_id || ''
        }));
        setPatientSearch(`${patient.first_name} ${patient.last_name}`);
        setShowPatientDropdown(false);


        // Auto-fill linked hospital if exists
        if (patient.primary_hospital_id) {
            try {
                const res = await axios.get(`${API_ENDPOINTS.HOSPITALS}?id=${patient.primary_hospital_id}`);
                if (res.data.hospital) {
                    setHospitalSearch(res.data.hospital.name);
                    // Also auto-fill GSTIN if Hospital customer
                    if (formData.customer_type === 'Hospital') {
                        setFormData(prev => ({ ...prev, customer_gstin: res.data.hospital.gst_number || '' }));
                    }
                }
            } catch (error) {
                console.error('Failed to fetch linked hospital details', error);
            }
        } else {
            setHospitalSearch('');
        }

        // Auto-fill Surgery Name if category is Surgery
        if (formData.category === 'Surgery' && patient.surgeries && patient.surgeries.length > 0) {
            const latestSurgery = patient.surgeries[0];
            const items = [...formData.line_items];
            if (items.length > 0) {
                items[0].description = latestSurgery.surgery_type || items[0].description;
                setFormData(prev => ({ ...prev, line_items: items }));
            }
        }
    };

    const selectMachine = (machine, index) => {
        // Auto-fill line item
        const items = [...formData.line_items];
        items[index].description = `${machine.machine_name} - ${machine.model_number} (SN: ${machine.serial_number})`;

        // Smart Price & Category Logic
        let price = 0;
        let newCategory = formData.category;

        if (machine.type === 'For Sale') {
            price = machine.sale_price;
            newCategory = 'Machine Sale';
        } else if (machine.type === 'For Rental' || machine.status === 'Rented') {
            price = machine.rental_price;
            newCategory = 'Machine Rental';
        } else {
            // Fallback: Check which price exists
            if (machine.rental_price) {
                price = machine.rental_price;
                newCategory = 'Machine Rental';
            } else if (machine.sale_price) {
                price = machine.sale_price;
                newCategory = 'Machine Sale';
            }
        }

        items[index].unit_price = price || 0;
        items[index].machine_id = machine.id; // Also ensure machine_id is linked manually

        setFormData(prev => ({
            ...prev,
            line_items: items,
            category: newCategory
        }));

        setShowMachineDropdown(false);
        setMachineSearch(''); // Reset search
        setActiveLineItemIndex(null);
    };

    const selectHospital = (hospital) => {
        setFormData(prev => ({ ...prev, hospital_id: hospital.id, customer_gstin: hospital.gst_number || '' })); // Autofill GST
        setHospitalSearch(hospital.name);
        setShowHospitalDropdown(false);
    };

    const updateField = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (field === 'customer_name') setPatientSearch(value);
    };

    // Auto-fill Dispatch Through based on Category
    useEffect(() => {
        let dispatchValue = 'Surgery Service';
        if (formData.category === 'Consumables') dispatchValue = 'Consumable Service';
        else if (formData.category.includes('Machine')) dispatchValue = 'Machine Service';

        setFormData(prev => ({ ...prev, dispatch_through: dispatchValue }));
    }, [formData.category]);

    const addLineItem = () => setFormData(prev => ({ ...prev, line_items: [...prev.line_items, { description: '', hsnsac: '', quantity: 1, unit_price: 0, batch_no: '', mfg_date: '', exp_date: '' }] }));
    const updateLineItem = (index, field, value) => { const items = [...formData.line_items]; items[index][field] = value; setFormData(prev => ({ ...prev, line_items: items })); };
    const removeLineItem = (index) => { if (formData.line_items.length > 1) setFormData(prev => ({ ...prev, line_items: prev.line_items.filter((_, i) => i !== index) })); };

    const calculateTotals = () => {
        const subtotal = formData.line_items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unit_price)), 0);
        const discount = (subtotal * Number(formData.discount_percentage)) / 100;
        const amountAfterDiscount = subtotal - discount;

        const tds = (amountAfterDiscount * Number(formData.tds_percentage)) / 100;
        const netTaxable = amountAfterDiscount - tds;

        const tax = (netTaxable * Number(formData.tax_percentage)) / 100;

        // Total = Net Taxable + Tax (GST)
        const total = netTaxable + tax;

        return { subtotal, tax, discount, tds, total };
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.customer_name || !formData.due_date) { toast.error('Please fill in required fields'); return; }
        setSubmitting(true);
        // Pass unbilledIds to parent submit handler
        try { await onSubmit(formData, unbilledIds); } finally { setSubmitting(false); }
    };

    const totals = calculateTotals();
    const formatCurrency = (amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(amount || 0);

    if (loadingUnbilled) {
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
                <div className="bg-white rounded-2xl p-8 flex flex-col items-center">
                    <div className="w-10 h-10 border-4 border-[#19ADB8] border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-gray-600">Fetching unbilled items...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
                    <div><h2 className="text-xl font-bold text-gray-900">Generate Invoice</h2><p className="text-sm text-gray-500">Create a new invoice for surgery, machine, or consumables</p></div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">Invoice Category *</label><select value={formData.category} onChange={(e) => updateField('category', e.target.value)} className="w-full px-4 py-2.5 border border-[#19ADB8] rounded-lg focus:ring-2 focus:ring-[#19ADB8]">{CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}</select></div>
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">Customer Type *</label><select value={formData.customer_type} onChange={(e) => updateField('customer_type', e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#19ADB8]">{CUSTOMER_TYPES.map(type => <option key={type} value={type}>{type}</option>)}</select></div>
                    </div>

                    {/* Patient/Customer Search Section */}
                    <div className="relative">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name *</label>
                        <input
                            type="text"
                            value={formData.customer_name}
                            onChange={(e) => updateField('customer_name', e.target.value)}
                            placeholder="Search Patient Name..."
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#19ADB8]"
                            required
                            autoComplete="off"
                        />
                        {showPatientDropdown && patients.length > 0 && (
                            <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 mt-1 rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto">
                                {patients.map(p => (
                                    <div key={p.id} onClick={() => selectPatient(p)} className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-0 border-gray-100">
                                        <p className="font-medium text-gray-900">{p.first_name} {p.last_name}</p>
                                        <p className="text-xs text-gray-500">{p.phone} | {p.patient_id}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input type="email" value={formData.customer_email} onChange={(e) => updateField('customer_email', e.target.value)} placeholder="customer@email.com" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#19ADB8]" /></div>
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">Phone</label><input type="text" value={formData.customer_phone} onChange={(e) => updateField('customer_phone', e.target.value)} placeholder="+91 XXXXX XXXXX" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#19ADB8]" /></div>
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">Due Date *</label><input type="date" value={formData.due_date} onChange={(e) => updateField('due_date', e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#19ADB8]" required /></div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">UHID</label>
                            <input type="text" value={formData.uhid} onChange={(e) => updateField('uhid', e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#19ADB8]" placeholder="UHID" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">IP Number</label>
                            <input type="text" value={formData.ip_number} onChange={(e) => updateField('ip_number', e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#19ADB8]" placeholder="IP No" />
                        </div>
                        <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Address</label><input type="text" value={formData.customer_address} onChange={(e) => updateField('customer_address', e.target.value)} placeholder="Customer address" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#19ADB8]" /></div>
                        <div>
                            <input type="text" value={formData.customer_gstin} onChange={(e) => updateField('customer_gstin', e.target.value)} placeholder="GSTIN (Optional)" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#19ADB8]" />
                        </div>
                    </div>

                    {/* New: Dispatch Details */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">Dispatch Details</h3>
                        <div className="grid grid-cols-3 gap-4">
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">Dispatch Doc No.</label><input type="text" value={formData.dispatch_doc_no} onChange={(e) => updateField('dispatch_doc_no', e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg" /></div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Dispatch Through</label>
                                <select value={formData.dispatch_through} onChange={(e) => updateField('dispatch_through', e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg">
                                    <option value="Surgery Service">Surgery Service</option>
                                    <option value="Machine Service">Machine Service</option>
                                    <option value="Consumable Service">Consumable Service</option>
                                </select>
                            </div>
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">Destination</label><input type="text" value={formData.destination} onChange={(e) => updateField('destination', e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg" /></div>
                        </div>
                    </div>

                    {/* New: Company Bank Details */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">Company Bank Details (For Payment)</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label><input type="text" value={formData.company_bank_name} onChange={(e) => updateField('company_bank_name', e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg" /></div>
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">Branch Name</label><input type="text" value={formData.company_branch_name} onChange={(e) => updateField('company_branch_name', e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg" /></div>
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">IFSC Code</label><input type="text" value={formData.company_ifsc_code} onChange={(e) => updateField('company_ifsc_code', e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg" /></div>
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label><input type="text" value={formData.company_account_number} onChange={(e) => updateField('company_account_number', e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg" /></div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Hospital Selection (Optional) */}
                        {/* Hospital Selection (Optional) */}
                        <div className="md:col-span-2 relative">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Linked Hospital (for Bank Details)</label>
                            <input
                                type="text"
                                value={hospitalSearch}
                                onChange={(e) => {
                                    setHospitalSearch(e.target.value);
                                    // If user clears the field, clear the ID too
                                    if (e.target.value === '') setFormData(prev => ({ ...prev, hospital_id: '' }));
                                }}
                                placeholder="Search Hospital Name..."
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#19ADB8]"
                            />
                            {showHospitalDropdown && hospitals.length > 0 && (
                                <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 mt-1 rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto">
                                    {hospitals.map(h => (
                                        <div key={h.id} onClick={() => selectHospital(h)} className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-0 border-gray-100">
                                            <p className="font-medium text-gray-900">{h.name}</p>
                                            <p className="text-xs text-gray-500">{h.city} {h.gst_number ? `| GST: ${h.gst_number}` : ''}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-3"><h3 className="text-sm font-semibold text-gray-900">Line Items</h3><button type="button" onClick={addLineItem} className="text-sm text-[#19ADB8] hover:text-[#17a0ab] font-medium flex items-center gap-1"><Plus size={16} />Add Item</button></div>
                        <div className="space-y-4">
                            {formData.line_items.map((item, index) => (
                                <div key={index} className="bg-gray-50 p-4 rounded-lg relative">
                                    {formData.line_items.length > 1 && (
                                        <button type="button" onClick={() => removeLineItem(index)} className="absolute top-2 right-2 p-1.5 text-red-500 hover:bg-red-50 rounded bg-white border border-red-100 shadow-sm z-10">
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                    <div className="space-y-3">
                                        <div className="space-y-1 relative">
                                            <label className="text-xs text-gray-500 sm:hidden">Description</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={item.description}
                                                    onChange={(e) => {
                                                        updateLineItem(index, 'description', e.target.value);
                                                        if (formData.category.includes('Machine')) {
                                                            setMachineSearch(e.target.value);
                                                            setActiveLineItemIndex(index);
                                                        }
                                                    }}
                                                    placeholder="Surgery / Item Name"
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                                                />
                                            </div>
                                            {/* Machine Search Dropdown */}
                                            {activeLineItemIndex === index && showMachineDropdown && machines.length > 0 && (
                                                <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 mt-1 rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto">
                                                    {machines.map(m => (
                                                        <div key={m.id} onClick={() => selectMachine(m, index)} className="p-2 hover:bg-gray-50 cursor-pointer border-b last:border-0 border-gray-100">
                                                            <p className="text-sm font-medium text-gray-900">{m.machine_name} - {m.model_number}</p>
                                                            <p className="text-xs text-gray-500">SN: {m.serial_number} | Price: {formData.category === 'Machine Sale' ? m.sale_price : m.rental_price}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-4 gap-3">
                                            <div className="space-y-1 col-span-1">
                                                <input type="text" value={item.hsnsac} onChange={(e) => updateLineItem(index, 'hsnsac', e.target.value)} placeholder="HSN/SAC" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-center bg-white" />
                                            </div>
                                            <div className="space-y-1 col-span-1">
                                                <label className="text-xs text-gray-500 sm:hidden">Qty</label>
                                                <input type="text" value={item.quantity} onChange={(e) => updateLineItem(index, 'quantity', e.target.value)} placeholder="Qty" min="1" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-center bg-white" />
                                            </div>
                                            <div className="space-y-1 col-span-1">
                                                <label className="text-xs text-gray-500 sm:hidden">Price</label>
                                                <input type="text" value={item.unit_price} onChange={(e) => updateLineItem(index, 'unit_price', e.target.value)} placeholder="Price" min="0" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-right bg-white" />
                                            </div>
                                        </div>
                                        <div className="space-y-1 col-span-1">
                                            <label className="text-xs text-gray-500 sm:hidden block">Total</label>
                                            <div className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-right font-medium text-gray-700 h-[38px] flex items-center justify-end">
                                                {(Number(item.quantity) * Number(item.unit_price)).toFixed(2)}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Extra Fields for Consumables */}
                                    <div className=' border-t border-gray-200 mt-5'>
                                        <h1 className='text-sm font-medium text-gray-700 mb-1'>For Consumables</h1>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3 pt-2">
                                        <div>
                                            <h1>Batch No</h1>
                                            <input type="text" value={item.batch_no} onChange={(e) => updateLineItem(index, 'batch_no', e.target.value)} placeholder="Batch No" className="w-full px-3 py-1.5 border border-gray-300 rounded text-xs bg-white" />
                                        </div>
                                        <div>
                                            <h1>Mfg Date</h1>
                                            <input type="date" value={item.mfg_date} onChange={(e) => updateLineItem(index, 'mfg_date', e.target.value)} title="Mfg Date" className="w-full px-3 py-1.5 border border-gray-300 rounded text-xs bg-white" />
                                        </div>
                                        <div>
                                            <h1>Exp Date</h1>
                                            <input type="date" value={item.exp_date} onChange={(e) => updateLineItem(index, 'exp_date', e.target.value)} title="Exp Date" className="w-full px-3 py-1.5 border border-gray-300 rounded text-xs bg-white" />
                                        </div>
                                    </div>
                                </div>

                            ))}
                        </div>
                    </div>

                    {/* Calculations */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">GST (%)</label><input type="text" value={formData.tax_percentage} onChange={(e) => updateField('tax_percentage', e.target.value)} min="0" max="100" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#19ADB8]" /></div>
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">TDS (%)</label><input type="text" value={formData.tds_percentage} onChange={(e) => updateField('tds_percentage', e.target.value)} min="0" max="100" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#19ADB8]" /></div>
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">Discount (%)</label><input type="text" value={formData.discount_percentage} onChange={(e) => updateField('discount_percentage', e.target.value)} min="0" max="100" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#19ADB8]" /></div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                        <div className="flex justify-between text-sm"><span className="text-gray-600">Subtotal:</span><span className="font-medium">{formatCurrency(totals.subtotal)}</span></div>

                        {totals.discount > 0 && <div className="flex justify-between text-sm"><span className="text-gray-600">Discount ({formData.discount_percentage}%):</span><span className="font-medium text-green-600">-{formatCurrency(totals.discount)}</span></div>}
                        <div className="flex justify-between text-sm"><span className="text-gray-600">TDS ({formData.tds_percentage}%):</span><span className="font-medium text-orange-600">-{formatCurrency(totals.tds)}</span></div>
                        <div className="flex justify-between text-sm pt-2 border-t border-dashed border-gray-200"><span className="text-gray-600">Net Taxable:</span><span className="font-medium">{formatCurrency(totals.subtotal - totals.discount - totals.tds)}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-gray-600">GST ({formData.tax_percentage}%):</span><span className="font-medium">{formatCurrency(totals.tax)}</span></div>

                        <div className="flex justify-between text-base font-bold pt-2 border-t border-gray-200"><span>Total Amount:</span><span className="text-[#004071]">{formatCurrency(totals.total)}</span></div>
                    </div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Notes</label><textarea value={formData.notes} onChange={(e) => updateField('notes', e.target.value)} placeholder="Additional notes for this invoice" rows={2} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#19ADB8]" /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Terms & Conditions</label><textarea value={formData.terms_conditions} onChange={(e) => updateField('terms_conditions', e.target.value)} rows={2} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#19ADB8]" /></div>
                    <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t"><button type="button" onClick={onClose} className="flex-1 px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 font-medium text-gray-700">Cancel</button><button type="submit" disabled={submitting} className="flex-1 px-6 py-3 bg-[#19ADB8] hover:bg-[#17a0ab] text-white rounded-xl font-medium shadow-lg shadow-[#19ADB8]/30 disabled:opacity-50">{submitting ? 'Generating...' : 'Generate Invoice'}</button></div>
                </form >
            </div >
        </div >
    );
}

// Edit Invoice Modal Component
function EditInvoiceModal({ invoice, onClose, onSubmit }) {
    const lineItems = typeof invoice.line_items === 'string'
        ? JSON.parse(invoice.line_items)
        : invoice.line_items || [{ description: '', quantity: 1, unit_price: 0 }];

    const [formData, setFormData] = useState({
        category: invoice.category || 'Surgery',
        customer_type: invoice.customer_type || 'Patient',
        customer_name: invoice.customer_name || '',
        customer_email: invoice.customer_email || '',
        customer_phone: invoice.customer_phone || '',
        customer_address: invoice.customer_address || '',
        uhid: invoice.uhid || '',
        ip_number: invoice.ip_number || '',
        hospital_id: invoice.hospital_id || '',
        due_date: invoice.due_date ? new Date(invoice.due_date).toISOString().split('T')[0] : '',
        line_items: lineItems,
        tax_percentage: invoice.tax_percentage || 18,
        discount_percentage: invoice.discount_percentage || 0,
        tds_percentage: invoice.tds_percentage || 0,
        notes: invoice.notes || '',
        terms_conditions: invoice.terms_conditions || '',
        dispatch_doc_no: invoice.dispatch_doc_no || '',
        dispatch_through: invoice.dispatch_through || 'Surgery Service',
        destination: invoice.destination || '',
        company_bank_name: invoice.company_bank_name || '',
        company_branch_name: invoice.company_branch_name || '',
        company_ifsc_code: invoice.company_ifsc_code || '',
        company_account_number: invoice.company_account_number || ''
    });

    const updateField = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));
    const addLineItem = () => setFormData(prev => ({ ...prev, line_items: [...prev.line_items, { description: '', hsnsac: '', quantity: 1, unit_price: 0, batch_no: '', mfg_date: '', exp_date: '' }] }));
    const updateLineItem = (index, field, value) => { const items = [...formData.line_items]; items[index][field] = value; setFormData(prev => ({ ...prev, line_items: items })); };
    const removeLineItem = (index) => { if (formData.line_items.length > 1) setFormData(prev => ({ ...prev, line_items: prev.line_items.filter((_, i) => i !== index) })); };

    const handleSubmit = async (e) => {
        e.preventDefault();
        await onSubmit(formData);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900">Edit Invoice</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">Invoice Category</label><select value={formData.category} onChange={(e) => updateField('category', e.target.value)} className="w-full px-4 py-2.5 border border-[#19ADB8] rounded-lg">{CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}</select></div>
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">Customer Type</label><select value={formData.customer_type} onChange={(e) => updateField('customer_type', e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg">{CUSTOMER_TYPES.map(type => <option key={type} value={type}>{type}</option>)}</select></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label><input type="text" value={formData.customer_name} onChange={(e) => updateField('customer_name', e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg" /></div>
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label><input type="date" value={formData.due_date} onChange={(e) => updateField('due_date', e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg" /></div>
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">UHID</label><input type="text" value={formData.uhid} onChange={(e) => updateField('uhid', e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg" /></div>
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">IP Number</label><input type="text" value={formData.ip_number} onChange={(e) => updateField('ip_number', e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg" /></div>
                        <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Hospital ID</label><input type="text" value={formData.hospital_id} onChange={(e) => updateField('hospital_id', e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg" /></div>
                    </div>

                    {/* New: Dispatch Details */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">Dispatch Details</h3>
                        <div className="grid grid-cols-3 gap-4">
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">Dispatch Doc No.</label><input type="text" value={formData.dispatch_doc_no} onChange={(e) => updateField('dispatch_doc_no', e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg" /></div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Dispatch Through</label>
                                <select value={formData.dispatch_through} onChange={(e) => updateField('dispatch_through', e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg">
                                    <option value="Surgery Service">Surgery Service</option>
                                    <option value="Machine Service">Machine Service</option>
                                    <option value="Consumable Service">Consumable Service</option>
                                </select>
                            </div>
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">Destination</label><input type="text" value={formData.destination} onChange={(e) => updateField('destination', e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg" /></div>
                        </div>
                    </div>

                    {/* New: Company Bank Details */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">Company Bank Details</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label><input type="text" value={formData.company_bank_name} onChange={(e) => updateField('company_bank_name', e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg" /></div>
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">Branch Name</label><input type="text" value={formData.company_branch_name} onChange={(e) => updateField('company_branch_name', e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg" /></div>
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">IFSC Code</label><input type="text" value={formData.company_ifsc_code} onChange={(e) => updateField('company_ifsc_code', e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg" /></div>
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label><input type="text" value={formData.company_account_number} onChange={(e) => updateField('company_account_number', e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg" /></div>
                        </div>
                    </div>

                    {/* Line Items */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center"><h3 className="font-semibold text-gray-900">Items</h3><button type="button" onClick={addLineItem} className="text-[#19ADB8] text-sm font-medium">+ Add</button></div>
                        {formData.line_items.map((item, index) => (
                            <div key={index} className="grid grid-cols-12 gap-2 bg-gray-50 p-3 rounded-lg relative">
                                <div className="col-span-5"><input type="text" value={item.description} onChange={(e) => updateLineItem(index, 'description', e.target.value)} placeholder="Item" className="w-full p-2 border rounded text-sm" /></div>
                                <div className="col-span-2"><input type="text" value={item.hsnsac} onChange={(e) => updateLineItem(index, 'hsnsac', e.target.value)} placeholder="HSN" className="w-full p-2 border rounded text-sm" /></div>
                                <div className="col-span-2"><input type="text" value={item.quantity} onChange={(e) => updateLineItem(index, 'quantity', e.target.value)} placeholder="Qty" className="w-full p-2 border rounded text-sm" /></div>
                                <div className="col-span-2"><input type="text" value={item.unit_price} onChange={(e) => updateLineItem(index, 'unit_price', e.target.value)} placeholder="Price" className="w-full p-2 border rounded text-sm" /></div>
                                <div className="col-span-1 flex items-center justify-center"><button type="button" onClick={() => removeLineItem(index)} className="text-red-500"><Trash2 size={16} /></button></div>
                                {/* Extra fields */}
                                <div className="col-span-12 grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-gray-100">
                                    <input type="text" value={item.batch_no || ''} onChange={(e) => updateLineItem(index, 'batch_no', e.target.value)} placeholder="Batch" className="p-1.5 border rounded text-xs" />
                                    <input type="date" value={item.mfg_date || ''} onChange={(e) => updateLineItem(index, 'mfg_date', e.target.value)} className="p-1.5 border rounded text-xs" title="Mfg" />
                                    <input type="date" value={item.exp_date || ''} onChange={(e) => updateLineItem(index, 'exp_date', e.target.value)} className="p-1.5 border rounded text-xs" title="Exp" />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">GST (%)</label><input type="text" value={formData.tax_percentage} onChange={(e) => updateField('tax_percentage', e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg" /></div>
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">TDS (%)</label><input type="text" value={formData.tds_percentage} onChange={(e) => updateField('tds_percentage', e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg" /></div>
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">Discount (%)</label><input type="text" value={formData.discount_percentage} onChange={(e) => updateField('discount_percentage', e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg" /></div>
                    </div>

                    <div className="flex gap-3 pt-4 border-t">
                        <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border rounded-lg">Cancel</button>
                        <button type="submit" className="flex-1 px-4 py-2 bg-[#19ADB8] text-white rounded-lg">Update Invoice</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// Record Payment Modal Component
function RecordPaymentModal({ invoice, onClose, onSubmit }) {
    const balanceDue = Number(invoice.total_amount) - Number(invoice.paid_amount);
    const [paymentData, setPaymentData] = useState({
        amount: balanceDue > 0 ? balanceDue : 0,
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'Cash',
        reference: '',
        notes: ''
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(paymentData);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-2xl w-full max-w-md">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-900">Record Payment</h3>
                    <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-blue-600">Total Amount:</span>
                            <span className="font-semibold">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(invoice.total_amount)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-red-600">Balance Due:</span>
                            <span className="font-bold text-red-700">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(balanceDue)}</span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Amount Paid</label>
                        <input
                            type="text"
                            required
                            min="1"
                            max={balanceDue > 0 ? balanceDue + 100 : undefined}
                            value={paymentData.amount}
                            onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#19ADB8] outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date</label>
                        <input
                            type="date"
                            required
                            value={paymentData.payment_date}
                            onChange={(e) => setPaymentData({ ...paymentData, payment_date: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#19ADB8] outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Payment Mode</label>
                        <select
                            value={paymentData.payment_method}
                            onChange={(e) => setPaymentData({ ...paymentData, payment_method: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#19ADB8] outline-none"
                        >
                            <option value="Cash">Cash</option>
                            <option value="UPI">UPI</option>
                            <option value="Bank Transfer">Bank Transfer</option>
                            <option value="Card">Card</option>
                            <option value="Cheque">Cheque</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Reference / Transaction ID</label>
                        <input
                            type="text"
                            value={paymentData.reference}
                            onChange={(e) => setPaymentData({ ...paymentData, reference: e.target.value })}
                            placeholder="e.g. UPI Ref, Check No."
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#19ADB8] outline-none"
                        />
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium">Cancel</button>
                        <button type="submit" className="flex-1 px-4 py-2 bg-[#19ADB8] text-white rounded-lg hover:bg-[#17a0ab] font-medium shadow-lg shadow-[#19ADB8]/30">Save Payment</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
