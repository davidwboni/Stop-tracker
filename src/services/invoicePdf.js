// Check amounts in integer pennies, not floating-point VAT percentages.
// Saved invoices carry their own VAT snapshot; older PDF records remain valid.
export function invoicePdfBreakdown(invoice){
 const total=Math.round(Number(invoice?.invoiceAmount)*100);
 if(!Number.isSafeInteger(total)||total<0)throw new Error('Invoice total is invalid.');
 const applied=invoice?.vatConfirmedFromStatement===true;
 if(!applied)return {netPence:total,vatPence:0,totalPence:total,vatApplied:false};
 const net=Math.round(Number(invoice?.netAmount)*100),vat=Math.round(Number(invoice?.vatAmount)*100);
 if(!Number.isSafeInteger(net)||!Number.isSafeInteger(vat)||net<=0||vat<=0||net+vat!==total)
   throw new Error('VAT amounts no longer match the saved invoice total. Review the original statement.');
 return {netPence:net,vatPence:vat,totalPence:total,vatApplied:true};
}
export async function buildInvoicePdf(invoice){
 if(!invoice.senderSnapshot||!invoice.clientSnapshot)throw new Error('This older record has no saved business details. Open Create invoice to prepare a new copy.');
 const {default:jsPDF}=await import('jspdf');const {default:autoTable}=await import('jspdf-autotable');const pdf=new jsPDF({unit:'pt',format:'a4'});const cash=n=>'£'+Number(n).toFixed(2);let y=48;
 pdf.setFontSize(22);pdf.text('INVOICE',40,y);pdf.setFontSize(10);pdf.text('No. '+String(invoice.invoiceNumber),555,y,{align:'right'});pdf.text(String(invoice.issuedDate||invoice.createdAt?.slice(0,10)||''),555,y+16,{align:'right'});y+=40;
 for(const [heading,data] of [['FROM',invoice.senderSnapshot],['BILL TO',invoice.clientSnapshot]]){pdf.setFontSize(10);pdf.text(heading,40,y);y+=18;for(const v of [data.name,data.address,data.email,data.extra].filter(Boolean)){const lines=pdf.splitTextToSize(String(v),500);if(y+lines.length*12>690){pdf.addPage();y=48;}pdf.text(lines,40,y);y+=lines.length*12+6;}y+=16;}
 const breakdown=invoicePdfBreakdown(invoice);
 pdf.text(`Period: ${invoice.dateFrom||'—'} to ${invoice.dateTo||'—'}`,40,y);
 const lines=breakdown.vatApplied?
   [['Delivery services (before VAT)',cash(breakdown.netPence/100)],['VAT (confirmed by driver)',cash(breakdown.vatPence/100)]]:
   [['Delivery services',cash(breakdown.totalPence/100)]];
 autoTable(pdf,{startY:y+20,head:[['Description','Amount']],body:lines,foot:[['Total',cash(breakdown.totalPence/100)]],margin:{left:40,right:40},headStyles:{fillColor:[80,65,170]}});
 if(invoice.notes){y=pdf.lastAutoTable.finalY+28;for(const line of pdf.splitTextToSize(String(invoice.notes),500)){if(y>780){pdf.addPage();y=48;}pdf.text(line,40,y);y+=13;}}
 return pdf;
}

export async function downloadSavedInvoice(invoice){const pdf=await buildInvoicePdf(invoice);pdf.save('Invoice_'+String(invoice.invoiceNumber).replace(/[^\w-]/g,'')+'.pdf');}


/**
 * Opens the device sharing / email app with an attached invoice PDF.
 * No browser Web Share result establishes that the recipient received email.
 * This does not update the invoice ledger's delivery status.
 */
export async function shareSavedInvoice(invoice){
 if(!invoice?.clientEmail)throw new Error('This invoice has no saved billing email. Use Download PDF and send it manually.');
 const pdf=await buildInvoicePdf(invoice);
 const name='Invoice_'+String(invoice.invoiceNumber).replace(/[^\w-]/g,'')+'.pdf';
 const file=new File([pdf.output('blob')],name,{type:'application/pdf'});
 if(navigator.share&&navigator.canShare?.({files:[file]})){
   await navigator.share({files:[file],title:'Invoice '+invoice.invoiceNumber,text:'Please email this invoice to '+invoice.clientEmail});
   return 'shared'; // This means share handoff, not delivery.
 }
 pdf.save(name);
 const subject=encodeURIComponent('Invoice INV-'+String(invoice.invoiceNumber).padStart(4,'0'));
 const body=encodeURIComponent('Please find my invoice attached.\n\nAttach '+name+' from Downloads before sending.');
 window.location.href='mailto:'+encodeURIComponent(invoice.clientEmail)+'?subject='+subject+'&body='+body;
 return 'composer';
}
