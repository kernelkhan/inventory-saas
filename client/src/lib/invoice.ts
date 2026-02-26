import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface SaleItem {
    id: number;
    saleDate: string;
    quantitySold: number;
    product: {
        name: string;
        price: number;
    };
}

interface UserDetails {
    name?: string | null;
    companyName?: string | null;
    companyAddress?: string | null;
    email?: string;
}

export const generateInvoice = (sale: SaleItem, user: UserDetails | null) => {
    const doc = new jsPDF();

    const companyName = user?.companyName || user?.name || "Inventory System";
    const companyAddress = user?.companyAddress || "";

    // -- Company Header --
    doc.setFontSize(22);
    doc.setTextColor(40, 40, 40);
    doc.text(companyName, 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    const splitAddress = doc.splitTextToSize(companyAddress, 80);
    doc.text(splitAddress, 14, 28);

    // -- Invoice Label & Details --
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(16);
    doc.text("INVOICE", 150, 20);

    doc.setFontSize(10);
    doc.text(`Invoice ID:  #${sale.id}`, 150, 28);
    doc.text(`Date:  ${new Date(sale.saleDate).toLocaleDateString()}`, 150, 33);

    // -- Table --
    const totalAmount = (sale.quantitySold * sale.product.price).toFixed(2);

    autoTable(doc, {
        startY: 50,
        head: [['Item Description', 'Quantity', 'Unit Price', 'Total']],
        body: [
            [
                sale.product.name,
                sale.quantitySold,
                `Rs. ${sale.product.price.toFixed(2)}`,
                `Rs. ${totalAmount}`
            ]
        ],
        foot: [
            ['', '', 'Grand Total:', `Rs. ${totalAmount}`]
        ],
        theme: 'grid',
        headStyles: { fillColor: [40, 40, 40] },
        footStyles: { fillColor: [240, 240, 240], textColor: [40, 40, 40], fontStyle: 'bold' }
    });

    // -- Footer --
    const finalY = (doc as any).lastAutoTable.finalY + 20;
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text("Thank you for your business!", 105, finalY, { align: "center" });

    // Save
    doc.save(`invoice_${sale.id}.pdf`);
};
