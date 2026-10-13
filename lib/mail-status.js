function deliveryError(error) {
  const code = String(error?.code || 'EMAIL_ERROR').slice(0, 40);
  const responseCode = Number(error?.responseCode) || null;
  let message = 'The mail provider could not accept this email. It remains queued for retry.';
  if (code === 'EAUTH') message = 'Gmail rejected the SMTP login. Check the Gmail address and app password in the server settings.';
  else if (code === 'ETIMEDOUT' || code === 'ECONNECTION' || code === 'ESOCKET' || code === 'EDNS') message = 'The mail server could not be reached. Check the connection and SMTP settings, then retry.';
  else if (code === 'EENVELOPE' || error?.command === 'RCPT TO') message = 'The mail provider rejected the recipient address. Check that email address before retrying.';
  else if (error?.command === 'MAIL FROM') message = 'The mail provider rejected the sender. Use the verified SMTP account as SMTP_FROM.';
  return { code, responseCode, message, attemptedAt: new Date().toISOString() };
}
function isConnectionError(error) { return ['EAUTH','ETIMEDOUT','ECONNECTION','ESOCKET','EDNS'].includes(error?.code); }
function isOwnerNotification(notification) { return notification.kind === 'owner' || (!notification.kind && notification.subject?.includes(': new reservation request ')); }
module.exports = { deliveryError, isConnectionError, isOwnerNotification };
