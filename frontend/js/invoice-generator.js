/**
 * Générateur de factures automatique
 */

class InvoiceGenerator {
    constructor() {
        this.invoiceCounter = this.loadCounter();
    }
    
    loadCounter() {
        return parseInt(localStorage.getItem('invoice_counter') || '0');
    }
    
    saveCounter() {
        localStorage.setItem('invoice_counter', this.invoiceCounter.toString());
    }
    
    getNextInvoiceNumber() {
        this.invoiceCounter++;
        this.saveCounter();
        const year = new Date().getFullYear();
        return `${year}-${String(this.invoiceCounter).padStart(4, '0')}`;
    }
    
    // Générer une facture pour un paiement
    async generateInvoiceForPayment(payment) {
        const invoiceNumber = this.getNextInvoiceNumber();
        const invoiceData = {
            number: invoiceNumber,
            date: new Date().toLocaleDateString('fr-FR'),
            payment: payment,
            items: [{
                description: `Achat de cacao - ${payment.weight_kg || 0}kg`,
                quantity: payment.weight_kg || 0,
                unit: 'kg',
                unitPrice: payment.price_per_kg || 0,
                total: payment.amount
            }],
            total: payment.amount
        };
        
        return this.generatePDF(invoiceData);
    }
    
    // Générer le PDF
    generatePDF(invoiceData) {
        const html = this.generateHTML(invoiceData);
        
        // Créer un blob HTML pour téléchargement
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        
        // Télécharger
        const a = document.createElement('a');
        a.href = url;
        a.download = `Facture_${invoiceData.number}.html`;
        a.click();
        URL.revokeObjectURL(url);
        
        showToast(`✅ Facture ${invoiceData.number} générée`, 'success');
        
        return invoiceData;
    }
    
    // Template HTML de la facture
    generateHTML(data) {
        return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Facture ${data.number}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 40px auto;
            padding: 20px;
            color: #333;
        }
        .header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 40px;
            border-bottom: 3px solid #2D5016;
            padding-bottom: 20px;
        }
        .company {
            font-size: 24px;
            font-weight: bold;
            color: #2D5016;
        }
        .invoice-number {
            text-align: right;
        }
        .invoice-number h1 {
            margin: 0;
            color: #2D5016;
        }
        .info-section {
            display: flex;
            justify-content: space-between;
            margin: 30px 0;
        }
        .info-box {
            background: #f5f5f5;
            padding: 15px;
            border-radius: 8px;
            width: 45%;
        }
        .info-box h3 {
            margin-top: 0;
            color: #2D5016;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 30px 0;
        }
        th {
            background: #2D5016;
            color: white;
            padding: 12px;
            text-align: left;
        }
        td {
            padding: 12px;
            border-bottom: 1px solid #ddd;
        }
        .total-section {
            text-align: right;
            margin-top: 30px;
        }
        .total-row {
            display: flex;
            justify-content: flex-end;
            margin: 10px 0;
            font-size: 18px;
        }
        .total-row.grand-total {
            font-size: 24px;
            font-weight: bold;
            color: #2D5016;
            border-top: 2px solid #2D5016;
            padding-top: 10px;
        }
        .total-label {
            margin-right: 20px;
        }
        .footer {
            margin-top: 60px;
            text-align: center;
            color: #666;
            font-size: 12px;
            border-top: 1px solid #ddd;
            padding-top: 20px;
        }
        @media print {
            body { margin: 0; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="company">
            🍫 CocoaTrack
            <div style="font-size: 14px; font-weight: normal; margin-top: 5px;">
                Système de gestion de cacao
            </div>
        </div>
        <div class="invoice-number">
            <h1>FACTURE</h1>
            <div style="font-size: 18px;">N° ${data.number}</div>
            <div style="font-size: 14px; color: #666;">Date: ${data.date}</div>
        </div>
    </div>
    
    <div class="info-section">
        <div class="info-box">
            <h3>Émetteur</h3>
            <strong>CocoaTrack</strong><br>
            Système de gestion<br>
            Cameroun
        </div>
        <div class="info-box">
            <h3>Bénéficiaire</h3>
            <strong>${data.payment.planter_name || 'N/A'}</strong><br>
            Planteur<br>
            ${data.payment.planter_phone || ''}
        </div>
    </div>
    
    <table>
        <thead>
            <tr>
                <th>Description</th>
                <th style="text-align: center;">Quantité</th>
                <th style="text-align: right;">Prix unitaire</th>
                <th style="text-align: right;">Total</th>
            </tr>
        </thead>
        <tbody>
            ${data.items.map(item => `
                <tr>
                    <td>${item.description}</td>
                    <td style="text-align: center;">${item.quantity} ${item.unit}</td>
                    <td style="text-align: right;">${item.unitPrice.toLocaleString('fr-FR')} FCFA</td>
                    <td style="text-align: right;">${item.total.toLocaleString('fr-FR')} FCFA</td>
                </tr>
            `).join('')}
        </tbody>
    </table>
    
    <div class="total-section">
        <div class="total-row grand-total">
            <span class="total-label">TOTAL:</span>
            <span>${data.total.toLocaleString('fr-FR')} FCFA</span>
        </div>
    </div>
    
    <div class="footer">
        <p>Facture générée automatiquement par CocoaTrack le ${new Date().toLocaleString('fr-FR')}</p>
        <p>Merci pour votre confiance</p>
    </div>
    
    <div class="no-print" style="text-align: center; margin-top: 30px;">
        <button onclick="window.print()" style="
            background: #2D5016;
            color: white;
            padding: 12px 30px;
            border: none;
            border-radius: 6px;
            font-size: 16px;
            cursor: pointer;
        ">🖨️ Imprimer</button>
    </div>
</body>
</html>
        `;
    }
}

// Instance globale
window.invoiceGenerator = new InvoiceGenerator();
