export async function buildInvoicePdf(invoice){
 if(!invoice.senderSnapshot||!invoice.clientSnapshot)throw new Error('This older record has no saved business details. Open Create invoice to prepare a new copy.');
 const {default:jsPDF}=await import('jspdf');const {default:autoTable}=await import('jspdf-autotable');const pdf=new jsPDF({unit:'pt',format:'a4'});const cash=n=>'£'+Number(n).toFixed(2);let y=48;
 pdf.setFontSize(22);pdf.text('INVOICE',40,y);pdf.setFontSize(10);pdf.text('No. '+String(invoice.invoiceNumber),555,y,{align:'right'});pdf.text(String(invoice.issuedDate||invoice.createdAt?.slice(0,10)||''),555,y+16,{align:'right'});y+=40;
 for(const [heading,data] of [['FROM',invoice.senderSnapshot],['BILL TO',invoice.clientSnapshot]]){pdf.setFontSize(10);pdf.text(heading,40,y);y+=18;for(const v of [data.name,data.address,data.email,data.extra].filter(Boolean)){const lines=pdf.splitTextToSize(String(v),500);if(y+lines.length*12>690){pdf.addPage();y=48;}pdf.text(lines,40,y);y+=lines.length*12+6;}y+=16;}
 pdf.text(`Period: ${invoice.dateFrom||'—'} to ${invoice.dateTo||'—'}`,40,y);autoTable(pdf,{startY:y+20,head:[['Description','Amount']],body:[['Delivery services',cash(invoice.invoiceAmount)]],foot:[['Total',cash(invoice.invoiceAmount)]],margin:{left:40,right:40},headStyles:{fillColor:[80,65,170]}});
 if(invoice.notes){y=pdf.lastAutoTable.finalY+28;for(const line of pdf.splitTextToSize(String(invoice.notes),500)){if(y>780){pdf.addPage();y=48;}pdf.text(line,40,y);y+=13;}}
 return pdf;
}

export async function downloadSavedInvoice(invoice){const pdf=await buildInvoicePdf(invoice);pdf.save('Invoice_'+String(invoice.invoiceNumber).replace(/[^\w-]/g,'')+'.pdf');}
