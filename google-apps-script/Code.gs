// Paste this into your Google Sheet -> Extensions -> Apps Script -> Code.gs
// Then click Deploy -> New deployment -> Web app -> Execute as: Me -> Who has access: Anyone.

const NOTIFICATION_EMAIL = 'carrytheoryin@gmail.com';

function getOrCreateSheet(ss, sheetName, headers) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const raw = (e && e.postData && e.postData.contents) ? e.postData.contents : '{}';
    const data = JSON.parse(raw);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const timestamp = data.timestamp || new Date().toISOString();

    if (data.type === 'order') {
      const sheet = getOrCreateSheet(ss, 'Orders', [
        'Timestamp',
        'Order Number',
        'Customer Name',
        'Email',
        'Phone',
        'Address',
        'City',
        'State',
        'PIN Code',
        'Items',
        'Subtotal (INR)',
        'Customisation Requested',
        'Customisation Fee (INR)',
        'Delivery Charges (INR)',
        'Total (INR)',
        'Payment Mode',
        'Payment Status',
        'UPI Reference',
      ]);

      sheet.appendRow([
        timestamp,
        data.orderNumber || '',
        data.customerName || '',
        data.email || '',
        data.phone || '',
        data.address || '',
        data.city || '',
        data.state || '',
        data.pinCode || '',
        data.itemsSummary || '',
        data.subtotal || 0,
        data.customisationRequested || 'No',
        data.customisationFee || 0,
        data.deliveryCharges || 0,
        data.total || 0,
        data.paymentMode || '',
        data.paymentStatus || '',
        data.upiTransactionRef || '',
      ]);

      MailApp.sendEmail({
        to: NOTIFICATION_EMAIL,
        subject: 'New Carry Theory Order ' + (data.orderNumber || '') + ' — INR ' + (data.total || 0),
        body:
          'New order received on Carry Theory:\n\n' +
          'Order Number: ' + (data.orderNumber || '') + '\n' +
          'Customer: ' + (data.customerName || '') + '\n' +
          'Phone: ' + (data.phone || '') + '\n' +
          'Email: ' + (data.email || '') + '\n' +
          'Shipping Address: ' + (data.address || '') + ', ' + (data.city || '') + ', ' + (data.state || '') + ' - ' + (data.pinCode || '') + '\n\n' +
          'Items: ' + (data.itemsSummary || '') + '\n' +
          'Customisation Requested: ' + (data.customisationRequested || 'No') + '\n' +
          'Delivery Charges: INR ' + (data.deliveryCharges || 0) + '\n' +
          'Total: INR ' + (data.total || 0) + '\n' +
          'Payment Mode: ' + (data.paymentMode || '') + '\n' +
          'UPI Reference: ' + (data.upiTransactionRef || 'N/A') + '\n',
      });
    } else if (data.type === 'subscriber') {
      const sheet = getOrCreateSheet(ss, 'Newsletter', ['Timestamp', 'Email']);
      const email = String(data.email || '').trim().toLowerCase();
      if (email) {
        sheet.appendRow([timestamp, email]);
        MailApp.sendEmail({
          to: NOTIFICATION_EMAIL,
          subject: 'New Carry Theory Newsletter Subscriber',
          body: 'New newsletter subscriber:\n\nEmail: ' + email + '\nTime: ' + timestamp,
        });
      }
    } else if (data.type === 'enquiry') {
      const sheet = getOrCreateSheet(ss, 'Messages', [
        'Timestamp',
        'Type',
        'Full Name',
        'Email',
        'Phone',
        'Product Interest',
        'Customisation Question',
        'Message',
      ]);

      sheet.appendRow([
        timestamp,
        data.enquiryType || 'contact',
        data.fullName || '',
        data.email || '',
        data.phone || '',
        data.productInterest || '',
        data.customisationRequirements || '',
        data.message || '',
      ]);

      MailApp.sendEmail({
        to: NOTIFICATION_EMAIL,
        subject: 'New Carry Theory Message from ' + (data.fullName || 'Visitor'),
        body:
          'Type: ' + (data.enquiryType || 'contact') + '\n' +
          'Name: ' + (data.fullName || '') + '\n' +
          'Email: ' + (data.email || '') + '\n' +
          'Phone: ' + (data.phone || '') + '\n' +
          'Product Interest: ' + (data.productInterest || '') + '\n' +
          'Details: ' + (data.customisationRequirements || '') + '\n\n' +
          'Message:\n' + (data.message || ''),
      });
    }

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}
