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

  const normalizeTenantName = (tenantName) => (
    tenantName
      .replace(/((meneer|mevrouw+|e\.a)\.?)|k[0-9]{8}/gi, '')
      .trim()
      .toLowerCase()
  );

  let sourceData;
  let outputData;
  let outputDataString;

  const sourceFileInput = document.getElementById('sourceFile');
  const dataFileInput = document.getElementById('dataFile');
  const outputTextarea = document.getElementById('output');
  const warningsEl = document.getElementById('warnings');

  const PaymentLinePattern = '000000000+';

  const printOutput = () => {
    const warnings = [];

    // Remove lines that don't have enough data
    const filteredOutputData = outputData.filter((line) => (
      line && line.some((item) => item.includes(PaymentLinePattern))
    ));

    sourceData.forEach(({
      tenantName,
      total,
      balance,
    }) => {
      if (tenantName && tenantName.length > 0) {
        let tenantLines = filteredOutputData.filter((line) => {
          const normalizedLineName = line[1].toLowerCase();
          return (
            // Line has a match on tenant name
            normalizedLineName.includes(tenantName.toLowerCase())
            // Try matching after removing some known additions
            || normalizedLineName.includes(normalizeTenantName(tenantName))
          );
        });

        if (tenantLines.length === 0) {
          tenantLines = filteredOutputData.filter((line) => {
            // Use string similarity matcher with threshold
            const normalizedTenantName = normalizeTenantName(tenantName);
            const normalizedLineName = normalizeTenantName(line[1]);
            return stringSimilarity.compareTwoStrings(normalizedTenantName, normalizedLineName) >= 0.575;
          });
        }

        if (tenantLines.length > 0) {
          if (tenantLines.length > 1) {
            warnings.push(`Multiple matches found for ${tenantName}`);
          } else {
            const [tenantLine] = tenantLines;
            const paymentLine = tenantLine.find((item) => item.includes(PaymentLinePattern));
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
      warningsEl.innerHTML = `<strong>Warnings found for ${warnings.length} line(s):</strong><br>${warnings.join('<br>')}`;
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
