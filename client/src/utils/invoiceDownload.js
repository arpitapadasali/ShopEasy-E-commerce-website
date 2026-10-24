import { orderService } from '../services/api.js';

/**
 * Downloads order PDF invoice and triggers browser file save
 * @param {string} orderId - Mongo ID of order
 * @param {string} orderNumber - Clean order number for filename
 */
export const downloadOrderInvoice = async (orderId, orderNumber = 'order') => {
  try {
    const blob = await orderService.downloadInvoice(orderId);
    const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `invoice-${orderNumber}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);
    return { success: true };
  } catch (err) {
    console.error('[InvoiceDownload] Error:', err);
    throw new Error(err.message || 'Failed to download PDF invoice.');
  }
};

export default downloadOrderInvoice;
