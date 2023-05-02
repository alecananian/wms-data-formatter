numeral.register('locale', 'nl-nl', {
  delimiters: {
    thousands: '.',
    decimal: ','
  },
  abbreviations: {
    thousand: 'k',
    million: 'mln',
    billion: 'mrd',
    trillion: 'bln'
  },
  ordinal: function (number) {
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

  const replaceAfterIndex = (str, search, replace, index) => (
    str.slice(0, index) + str.slice(index).replace(search, replace)
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
      id,
      tenantName,
      total,
      balance,
    }) => {
      if (id || tenantName) {
        let tenantLines = filteredOutputData.filter((line) => {
          if (id) {
            return line.some((item) => item.toLowerCase() === id.toLowerCase());
          }

          const nameLine = line[1].toLowerCase();
          return (
            // Line has a match on tenant name
            nameLine.includes(tenantName.toLowerCase())
            // Try matching after removing some known additions
            || nameLine.includes(normalizeTenantName(tenantName))
          );
        });

        if (tenantLines.length === 0 && tenantName) {
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
            const tenantId = tenantLine[1];
            const paymentLine = tenantLine.find((item) => item.includes(PaymentLinePattern));
            const payments = paymentLine.split('+');
            payments[2] = padNumber(id ? total - balance : total, '+');
            payments[3] = padNumber(balance);
            const newPaymentLine = (
              payments
                .join('+')
                .replace(/\+\+/g, '+')
                .replace(/-\+/g, '-')
            );
            const tenantIndex = outputDataString.indexOf(tenantId);
            outputDataString = replaceAfterIndex(outputDataString, paymentLine, newPaymentLine, tenantIndex);
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
      sourceData = data.map((item) => {
        const id = (item['Medl.nr.'] || '').trim();

        // Normalize tenant name
        const firstName = (item.Fornavn || '').trim();
        const lastName = (item.Etternavn || '').trim();
        let tenantName = (item.TenantName || '').trim();
        if (!tenantName && (firstName || lastName)) {
          tenantName = firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName;
        }

        const total = item.Total || item['Akk. Akonto per des.'] || '0';
        const balance = item.Balance || item['Str�mkonto (til gode +, skylder -)'] || item['Strømkonto (til gode +, skylder -)'] || '0';
        return {
          id,
          tenantName,
          total: numeral(total).value(),
          balance: numeral(balance).value(),
        }
      });

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
