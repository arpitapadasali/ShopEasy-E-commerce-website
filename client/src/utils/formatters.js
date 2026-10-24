/**
 * Currency and display formatting utilities
 */

/**
 * Format price stored in paise into Indian Rupees (INR)
 * @param {number} priceInPaise - Integer paise amount (e.g. 499900)
 * @returns {string} Formatted currency string (e.g. "₹4,999.00")
 */
export const formatINR = (priceInPaise) => {
  if (typeof priceInPaise !== 'number' || isNaN(priceInPaise)) {
    return '₹0.00';
  }
  const rupees = priceInPaise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rupees);
};

export default { formatINR };
