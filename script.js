numeral.register('locale', 'nl-nl', {
  delimiters: {
    thousands: '.',
    decimal  : ','
  },
  abbreviations: {
    thousand : 'k',
    million  : 'mln',
    billion  : 'mrd',
    trillion : 'bln'
  },
  ordinal : function (number) {
    var remainder = number % 100;
    return (number !== 0 && remainder <= 1 || remainder === 8 || remainder >= 20) ? 'ste' : 'de';
  },
  currency: {
    symbol: '€ '
  }
});
numeral.locale('nl-nl');

(() => {
  const readFile = (file, callback) => {
    const reader = new FileReader();
    reader.addEventListener('load', (e) => {
      callback(e.target.result);
    });
    reader.readAsText(file);
  };

  const padNumber = (number, suffix) => {
    const numberString = Math.abs(number).toFixed(2).toString().replace(/\D/g, '');
    const paddedNumber = (`000000000${numberString}`).slice(-9);
    return `${paddedNumber}${suffix || (number > 0 ? '-' : '+')}`;
  };

  let sourceData;
  let outputData;
  let outputDataString;

  const printOutput = (textarea) => {
    sourceData.forEach(({
      tenantName,
      total,
      balance,
    }) => {
      const tenantLines = outputData.filter((line) => line && line[1] && line[1].includes(tenantName));
      if (tenantLines.length > 0) {
        if (tenantLines.length > 1) {
          console.warn('Multiple matches found for', tenantName);
        } else {
          const [tenantLine] = tenantLines;
          const paymentLine = tenantLine[2];
          const payments = paymentLine.split('+');
          payments[2] = padNumber(total, '+');
          payments[3] = padNumber(balance);
          const newPaymentLine = (
            payments
              .join('+')
              .replace(/\+\+/g, '+')
              .replace(/-\+/g, '-')
          );
          outputDataString = outputDataString.replace(paymentLine, newPaymentLine);
        }
      }
    });

    if (textarea) {
      textarea.value = outputDataString;
    } else {
      console.log(outputDataString);
    }
  };

  const sourceFileInput = document.getElementById('sourceFile');
  const dataFileInput = document.getElementById('dataFile');
  const outputTextarea = document.getElementById('output');

  sourceFileInput.addEventListener('change', (e) => {
    const [file] = e.target.files;
    readFile(file, (result) => {
      const { data } = Papa.parse(result, {
        delimiter: ';',
        header: true,
      });
      sourceData = data.map(({
        TenantName,
        Total,
        Balance,
      }) => ({
        tenantName: TenantName,
        total: numeral(Total).value(),
        balance: numeral(Balance).value(),
      }));

      if (sourceData && outputData) {
        printOutput(outputTextarea);
      }
    });
  });

  dataFileInput.addEventListener('change', (e) => {
    const [file] = e.target.files;
    readFile(file, (result) => {
      outputDataString = result;
      outputData = (
        outputDataString
          .split('\r\n')
          .map((line) => line.split(/\  +/))
      );
      outputData.shift();

      if (sourceData && outputData) {
        printOutput(outputTextarea);
      }
    });
  });
})();
