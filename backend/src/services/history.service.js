const fs = require('fs');
const ExcelJS = require('exceljs');

const {
  SEND_HISTORY_FILE
} = require('../utils/path.util');

function configureSheet(sheet) {
  sheet.columns = [
    {
      header: 'Email',
      key: 'email',
      width: 42
    },
    {
      header: 'Email Type',
      key: 'emailType',
      width: 20
    },
    {
      header: 'Status',
      key: 'status',
      width: 20
    },
    {
      header: 'Reason',
      key: 'reason',
      width: 50
    },
    {
      header: 'Message ID',
      key: 'messageId',
      width: 55
    },
    {
      header: 'Sent At',
      key: 'sentAt',
      width: 30
    }
  ];
}

async function appendHistory(records) {
  const workbook =
    new ExcelJS.Workbook();

  let sheet;

  if (
    fs.existsSync(
      SEND_HISTORY_FILE
    )
  ) {
    await workbook.xlsx.readFile(
      SEND_HISTORY_FILE
    );

    sheet =
      workbook.getWorksheet(
        'Send History'
      );
  }

  if (!sheet) {
    sheet =
      workbook.addWorksheet(
        'Send History'
      );

    configureSheet(sheet);
  }

  /*
   * If workbook already has the new column
   * layout, make sure keys are configured.
   */
  const firstRowValues =
    sheet.getRow(1).values;

  const headers =
    firstRowValues.map(value =>
      String(value || '').trim()
    );

  const hasNewFormat =
    headers.includes('Email Type') &&
    headers.includes('Message ID');

  if (hasNewFormat) {
    sheet.getColumn(
      headers.indexOf('Email')
    ).key = 'email';

    sheet.getColumn(
      headers.indexOf('Email Type')
    ).key = 'emailType';

    sheet.getColumn(
      headers.indexOf('Status')
    ).key = 'status';

    sheet.getColumn(
      headers.indexOf('Reason')
    ).key = 'reason';

    sheet.getColumn(
      headers.indexOf('Message ID')
    ).key = 'messageId';

    sheet.getColumn(
      headers.indexOf('Sent At')
    ).key = 'sentAt';
  }

  records.forEach(record => {
    if (hasNewFormat) {
      sheet.addRow({
        email: record.email,

        emailType:
          record.emailType ||
          'INITIAL',

        status:
          record.status,

        reason:
          record.reason || '',

        messageId:
          record.messageId || '',

        sentAt:
          record.sentAt ||
          new Date().toISOString()
      });
    } else {
      /*
       * Backward compatibility with your old
       * workbook structure.
       */
      sheet.addRow({
        email: record.email,

        status:
          record.emailType
            ? `${record.status} - ${record.emailType}`
            : record.status,

        reason:
          record.reason || '',

        sentAt:
          record.sentAt ||
          new Date().toISOString()
      });
    }
  });

  await workbook.xlsx.writeFile(
    SEND_HISTORY_FILE
  );
}

module.exports = {
  appendHistory
};