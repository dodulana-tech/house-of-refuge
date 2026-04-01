// Replace with your live key before deploying
export const PAYSTACK_KEY = import.meta.env.VITE_PAYSTACK_KEY || 'pk_test_placeholder'

export function fmt(n) {
  return '₦' + Number(n).toLocaleString('en-NG')
}

export function ref(prefix = 'HOR') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7).toUpperCase()}`
}

/**
 * Open Paystack inline checkout
 * @param {object} opts
 * @param {string}   opts.email
 * @param {number}   opts.amount   — in kobo (multiply naira × 100)
 * @param {string}   opts.ref
 * @param {object[]} opts.fields   — metadata custom_fields
 * @param {function} opts.onSuccess(response)
 * @param {function} [opts.onClose]
 */
export function pay({ email, amount, ref: txRef, fields = [], onSuccess, onClose }) {
  const handler = window.PaystackPop.setup({
    key: PAYSTACK_KEY,
    email,
    amount,
    currency: 'NGN',
    ref: txRef,
    metadata: { custom_fields: fields },
    callback: onSuccess,
    onClose: onClose || (() => {}),
  })
  handler.openIframe()
}
