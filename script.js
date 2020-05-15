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

  const sourceFileInput = document.getElementById('sourceFile');
  const dataFileInput = document.getElementById('dataFile');
  const outputTextarea = document.getElementById('output');
  const warningsEl = document.getElementById('warnings');

  const printOutput = () => {
    const warnings = [];
    sourceData.forEach(({
      tenantName,
      total,
      balance,
    }) => {
      if (tenantName && tenantName.length > 0) {
        const tenantLines = outputData.filter((line) => {
          // Line doesn't have enough data
          if (!line || line.length < 3) {
            return false;
          }
          
          // Line doesn't include payment data
          if (!line[2].includes('000000000+')) {
            return false;
          }

          // Line has a match on tenant name
          if (line[1].includes(tenantName)) {
            return true;
          }

          // Try matching agains the last part of the tenant name
          const nameParts = tenantName.split(' ');
          return new RegExp(`${nameParts[nameParts.length - 1]}$`).test(line[1].trim());
        });
        if (tenantLines.length > 0) {
          if (tenantLines.length > 1) {
            warnings.push(`Multiple matches found for ${tenantName}`);
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
        } else {
          warnings.push(`No data found for ${tenantName}`);
        }
      }
    });

    outputTextarea.value = outputDataString;
    if (warnings.length > 0) {
      warningsEl.innerHTML = warnings.join('<br>');
      warningsEl.classList.remove('d-none');
    } else {
      warningsEl.classList.add('d-none');
    }
  };

  sourceFileInput.addEventListener('change', (e) => {
    const [file] = e.target.files;
    readFile(file, (result) => {
      const { data } = Papa.parse(result, {
        delimiter: ';',
        header: true,
      });
      sourceData = data.map(({
        TenantName = '',
        Total = '0',
        Balance = '0',
      }) => ({
        tenantName: TenantName.trim(),
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
